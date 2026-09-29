import threading
import time
import uuid
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from backend.app.core.logging import logger
from backend.app.schemas.intelligence import (
    DatasetCapabilities,
    DetectedColumn,
)
from backend.app.schemas.upload import DatasetProfileResponse, FileMetadata


class DatasetCacheService:
    """
    In-memory session cache for uploaded tabular datasets.
    Provides fast vectorized slicing, filtering, and session persistence.
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super(DatasetCacheService, cls).__new__(cls)
                    cls._instance._cache = {}
                    cls._instance._max_items = 20
        return cls._instance

    def register(
        self,
        df: pd.DataFrame,
        profile: DatasetProfileResponse,
        detected_columns: List[DetectedColumn],
        capabilities: DatasetCapabilities,
        file_metadata: FileMetadata,
        dataset_id: Optional[str] = None,
    ) -> str:
        """Stores a parsed dataset and returns its unique dataset_id."""
        with self._lock:
            # Cleanup old entries if cache exceeds max size
            if len(self._cache) >= self._max_items:
                oldest_id = min(self._cache.keys(), key=lambda k: self._cache[k]["timestamp"])
                del self._cache[oldest_id]

            ds_id = dataset_id or f"ds_{uuid.uuid4().hex[:12]}"
            self._cache[ds_id] = {
                "df": df.copy(),
                "profile": profile,
                "detected_columns": detected_columns,
                "capabilities": capabilities,
                "file_metadata": file_metadata,
                "timestamp": time.time(),
            }
            logger.info(f"Registered dataset {ds_id} ({len(df)} rows, {len(df.columns)} cols) in cache.")
            return ds_id

    def get(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves dataset entry by ID, updating its access timestamp."""
        with self._lock:
            entry = self._cache.get(dataset_id)
            if entry:
                entry["timestamp"] = time.time()
                return entry
            return None

    @classmethod
    def filter_dataframe(
        cls,
        df: pd.DataFrame,
        filters: Dict[str, Any],
        detected_columns: List[DetectedColumn],
    ) -> Tuple[pd.DataFrame, List[str]]:
        """
        Dynamically applies categorical multi-select, numeric range, and datetime
        filters across a DataFrame. Returns (filtered_df, active_filters_summary).
        """
        if not filters or df.empty:
            return df, []

        col_lookup = {dc.name: dc for dc in detected_columns}
        mask = pd.Series(True, index=df.index)
        summary: List[str] = []

        # 0. Global Text Search across textual and categorical columns
        search_query = filters.get("_search") if "_search" in filters else filters.get("search")
        if search_query and isinstance(search_query, str) and search_query.strip():
            sq = search_query.strip().lower()
            text_cols = [
                dc.name for dc in detected_columns
                if dc.name in df.columns and dc.type in ["categorical", "text", "identifier"]
            ]
            if not text_cols:
                text_cols = [c for c in df.columns if df[c].dtype == object or str(df[c].dtype) == "string"]

            if text_cols:
                search_mask = pd.Series(False, index=df.index)
                for tc in text_cols[:10]:
                    search_mask |= df[tc].astype(str).str.lower().str.contains(sq, regex=False, na=False)
                mask &= search_mask
                summary.append(f'Search: "{sq}"')

        for col_name, filter_val in filters.items():
            if col_name in ["_search", "search"] or col_name not in df.columns or filter_val is None:
                continue

            dc = col_lookup.get(col_name)
            col_type = dc.type if dc else "text"
            s = df[col_name]

            # 1. Categorical / Text / Boolean list filter
            if isinstance(filter_val, list):
                if not filter_val:
                    continue
                # String conversion for robust matching
                str_filter_vals = {str(v).strip().lower() for v in filter_val}
                s_str = s.astype(str).str.strip().str.lower()
                mask &= s_str.isin(str_filter_vals)
                display_vals = ", ".join(str(v) for v in filter_val[:3])
                if len(filter_val) > 3:
                    display_vals += f" +{len(filter_val) - 3} more"
                summary.append(f"{col_name}: {display_vals}")

            # 2. Numeric or Date range dictionary filter
            elif isinstance(filter_val, dict):
                # Numeric range
                if "min" in filter_val or "max" in filter_val:
                    min_v = filter_val.get("min")
                    max_v = filter_val.get("max")
                    s_num = pd.to_numeric(s, errors="coerce")
                    sub_mask = pd.Series(True, index=df.index)
                    parts = []
                    if min_v is not None and str(min_v).strip() != "":
                        sub_mask &= (s_num >= float(min_v))
                        parts.append(f"≥ {min_v}")
                    if max_v is not None and str(max_v).strip() != "":
                        sub_mask &= (s_num <= float(max_v))
                        parts.append(f"≤ {max_v}")
                    mask &= sub_mask
                    if parts:
                        summary.append(f"{col_name}: {' and '.join(parts)}")

                # Date range (including presets)
                elif "start" in filter_val or "end" in filter_val or "preset" in filter_val:
                    start_d = filter_val.get("start")
                    end_d = filter_val.get("end")
                    preset = filter_val.get("preset")

                    s_dt = pd.to_datetime(s, errors="coerce")
                    sub_mask = pd.Series(True, index=df.index)
                    parts = []

                    # Handle date presets relative to latest dataset date
                    if preset and not s_dt.dropna().empty:
                        max_dt = s_dt.dropna().max()
                        if preset == "today":
                            start_d = max_dt.strftime("%Y-%m-%d")
                            end_d = max_dt.strftime("%Y-%m-%d")
                            parts.append(f"Latest Date ({start_d})")
                        elif preset == "this_week":
                            start_d = (max_dt - pd.Timedelta(days=7)).strftime("%Y-%m-%d")
                            end_d = max_dt.strftime("%Y-%m-%d")
                            parts.append("Latest 7 Days")
                        elif preset == "this_month":
                            start_d = (max_dt - pd.Timedelta(days=30)).strftime("%Y-%m-%d")
                            end_d = max_dt.strftime("%Y-%m-%d")
                            parts.append("Latest 30 Days")
                        elif preset == "this_year":
                            start_d = (max_dt - pd.Timedelta(days=365)).strftime("%Y-%m-%d")
                            end_d = max_dt.strftime("%Y-%m-%d")
                            parts.append("Latest 365 Days")

                    if start_d:
                        sub_mask &= (s_dt >= pd.to_datetime(start_d))
                        if not parts:
                            parts.append(f"from {start_d}")
                    if end_d:
                        # Include entire end day by setting to end of day if only date
                        end_ts = pd.to_datetime(end_d)
                        if end_ts.hour == 0 and end_ts.minute == 0 and end_ts.second == 0:
                            end_ts = end_ts + pd.Timedelta(days=1) - pd.Timedelta(nanoseconds=1)
                        sub_mask &= (s_dt <= end_ts)
                        if not parts:
                            parts.append(f"to {end_d}")
                    mask &= sub_mask
                    if parts:
                        summary.append(f"{col_name}: {' '.join(parts)}")

            # 3. Scalar exact match (e.g. boolean or string)
            elif isinstance(filter_val, (str, bool, int, float)):
                if isinstance(filter_val, str) and filter_val.strip() == "":
                    continue
                if isinstance(filter_val, bool) or str(filter_val).lower() in ["true", "false"]:
                    b_val = str(filter_val).lower() == "true"
                    s_str = s.astype(str).str.strip().str.lower()
                    mask &= s_str.isin([str(b_val).lower(), "1" if b_val else "0", "yes" if b_val else "no"])
                    summary.append(f"{col_name}: {filter_val}")
                else:
                    s_str = s.astype(str).str.strip().str.lower()
                    target_str = str(filter_val).strip().lower()
                    mask &= (s_str == target_str)
                    summary.append(f"{col_name}: {filter_val}")

        filtered_df = df[mask].copy()
        return filtered_df, summary


dataset_cache = DatasetCacheService()
