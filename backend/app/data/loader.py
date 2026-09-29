import os
import glob
from pathlib import Path
from typing import Dict, Any, Optional, List
import pandas as pd
from backend.app.core.config import settings
from backend.app.core.logging import logger

CANONICAL_TABLE_PATTERNS = {
    "order_items": ["order_items", "order_item", "orderitems"],
    "payments": ["order_payments", "order_payment", "payments", "payment"],
    "reviews": ["order_review_ratings", "order_review", "order_reviews", "reviews", "review"],
    "orders": ["orders", "order"],
    "customers": ["customers", "customer"],
    "products": ["products", "product"],
    "sellers": ["sellers", "seller"],
    "geolocation": ["geo_location", "geolocation", "geo", "locations", "location"]
}

class DataLoader:
    """
    Robust data loader responsible for discovering, reading, and profiling
    raw tabular CSV files from the configured raw directory.
    """
    def __init__(self, raw_dir: Optional[Path] = None):
        self.raw_dir = Path(raw_dir) if raw_dir else settings.DATA_RAW_DIR
        # Fallback to root data/raw if backend/data/raw is empty or does not exist
        if not self.raw_dir.exists() or not list(self.raw_dir.glob("*.csv")):
            alt_dir = settings.WORKSPACE_DIR / "data" / "raw"
            if alt_dir.exists() and list(alt_dir.glob("*.csv")):
                self.raw_dir = alt_dir
            else:
                alt2_dir = settings.BASE_DIR / "data" / "raw"
                if alt2_dir.exists() and list(alt2_dir.glob("*.csv")):
                    self.raw_dir = alt2_dir

        self.tables: Dict[str, pd.DataFrame] = {}
        self.ingestion_report: Dict[str, Any] = {}

    def discover_files(self) -> Dict[str, Path]:
        """Discover CSV files in the raw directory and map to canonical names."""
        discovered = {}
        if not self.raw_dir.exists():
            logger.warning(f"Raw directory does not exist: {self.raw_dir}")
            return discovered

        csv_paths = list(self.raw_dir.glob("*.csv"))
        logger.info(f"Discovered {len(csv_paths)} CSV files in {self.raw_dir}")

        for path in csv_paths:
            base_name = path.stem.lower()
            matched_canonical = None

            # First pass: exact match
            for canonical, patterns in CANONICAL_TABLE_PATTERNS.items():
                if base_name in patterns:
                    matched_canonical = canonical
                    break

            # Second pass: substring match with priority for longer patterns
            if not matched_canonical:
                for canonical, patterns in CANONICAL_TABLE_PATTERNS.items():
                    for pat in patterns:
                        if pat in base_name:
                            matched_canonical = canonical
                            break
                    if matched_canonical:
                        break

            if not matched_canonical:
                matched_canonical = base_name

            discovered[matched_canonical] = path
            logger.info(f"Mapped '{path.name}' -> canonical table '{matched_canonical}'")

        return discovered

    def load_single_csv(self, file_path: Path) -> pd.DataFrame:
        """
        Loads a single CSV with encoding fallback, error handling, and malformed row recovery.
        """
        encodings = ["utf-8", "latin1", "cp1252", "iso-8859-1"]
        df = None
        last_error = None

        for enc in encodings:
            try:
                df = pd.read_csv(
                    file_path,
                    encoding=enc,
                    low_memory=False,
                    on_bad_lines="warn"
                )
                logger.debug(f"Successfully loaded {file_path.name} with {enc} encoding")
                break
            except Exception as e:
                last_error = e
                logger.debug(f"Failed to load {file_path.name} with {enc}: {e}")

        if df is None:
            logger.error(f"Could not read {file_path} with any supported encoding: {last_error}")
            raise RuntimeError(f"Failed to read CSV {file_path}: {last_error}")

        return df

    def profile_dataframe(self, name: str, df: pd.DataFrame) -> Dict[str, Any]:
        """Profile table statistics, columns, types, and missing values."""
        date_candidates = []
        numeric_candidates = []
        text_candidates = []

        for col in df.columns:
            col_lower = col.lower()
            if any(k in col_lower for k in ["date", "time", "timestamp"]):
                date_candidates.append(col)
            elif pd.api.types.is_numeric_dtype(df[col]):
                numeric_candidates.append(col)
            else:
                text_candidates.append(col)

        profile = {
            "name": name,
            "row_count": len(df),
            "column_count": len(df.columns),
            "columns": list(df.columns),
            "null_counts": df.isnull().sum().to_dict(),
            "duplicate_rows": int(df.duplicated().sum()),
            "date_candidates": date_candidates,
            "numeric_candidates": numeric_candidates,
            "text_candidates": text_candidates,
            "memory_usage_mb": round(df.memory_usage(deep=True).sum() / (1024 * 1024), 2)
        }
        return profile

    def load_all(self) -> Dict[str, pd.DataFrame]:
        """
        Discovers, loads, and profiles all datasets.
        Returns dictionary of loaded DataFrames.
        """
        discovered = self.discover_files()
        if not discovered:
            raise FileNotFoundError(f"No CSV files found in {self.raw_dir}")

        self.tables = {}
        self.ingestion_report = {
            "source_directory": str(self.raw_dir),
            "tables_loaded": {},
            "total_rows": 0
        }

        for canonical_name, path in discovered.items():
            logger.info(f"Loading table '{canonical_name}' from {path.name}...")
            df = self.load_single_csv(path)
            self.tables[canonical_name] = df
            profile = self.profile_dataframe(canonical_name, df)
            self.ingestion_report["tables_loaded"][canonical_name] = profile
            self.ingestion_report["total_rows"] += profile["row_count"]
            logger.info(
                f"Loaded '{canonical_name}': {profile['row_count']:,} rows, "
                f"{profile['column_count']} cols, {profile['memory_usage_mb']} MB"
            )

        return self.tables

    def get_ingestion_summary(self) -> Dict[str, Any]:
        """Return structured summary of the ingestion process."""
        return self.ingestion_report
