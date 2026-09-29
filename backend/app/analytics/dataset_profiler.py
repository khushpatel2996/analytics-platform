import io
import json
import re
from datetime import datetime, date
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from fastapi import HTTPException

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.schemas.upload import (
    ColumnProfile,
    DatasetOverview,
    DatasetProfileResponse,
    DatasetSummary,
    DateRange,
    FileMetadata,
    NumericStatistics,
    QualityScore,
    ValueFrequency,
)


class DatasetProfiler:
    """
    Comprehensive, generic dataset profiling engine.
    Processes arbitrary tabular datasets (CSV, XLSX, XLS, JSON) in memory
    and returns a structured statistical, semantic, and data quality profile.
    """

    DATE_SEPARATOR_PATTERN = re.compile(
        r'[-/.]|(?:\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b)',
        re.IGNORECASE,
    )

    @staticmethod
    def serialize_value(val: Any) -> Any:
        """Convert scalar value to JSON-safe Python native types."""
        if pd.isna(val) or val is None:
            return None
        if isinstance(val, (np.floating, float)):
            if np.isnan(val) or np.isinf(val):
                return None
            return float(val)
        if isinstance(val, (np.integer, int)):
            return int(val)
        if isinstance(val, (np.bool_, bool)):
            return bool(val)
        if isinstance(val, (pd.Timestamp, datetime, date)):
            return val.isoformat()
        return str(val)

    @classmethod
    def _is_safe_date_column(cls, non_null: pd.Series) -> bool:
        """
        Safely inspect non-null string samples to check if the column contains dates.
        Strictly prevents arbitrary texts or numeric IDs from being misclassified.
        """
        sample = non_null.head(50).astype(str)
        if sample.empty:
            return False

        valid_date_count = 0
        for val in sample:
            val_clean = val.strip()
            # Dates in strings are typically between 6 and 35 chars
            if len(val_clean) < 6 or len(val_clean) > 35:
                continue
            # Pure numbers with no separators (e.g. 123456) are numeric, not dates
            if val_clean.isdigit():
                continue
            # Must contain standard date separators or month names
            if not cls.DATE_SEPARATOR_PATTERN.search(val_clean):
                continue
            try:
                parsed = pd.to_datetime(val_clean, errors="coerce", format="mixed")
                if pd.notna(parsed) and 1900 <= parsed.year <= 2100:
                    valid_date_count += 1
            except Exception:
                pass

        return (valid_date_count / len(sample)) >= 0.80

    @classmethod
    def detect_semantic_type(cls, s: pd.Series, col_name: str = "") -> str:
        """
        Classifies column into semantic types:
        'numeric', 'categorical', 'datetime', 'boolean', or 'text'.
        """
        # 1. Boolean check
        if pd.api.types.is_bool_dtype(s):
            return "boolean"

        non_null = s.dropna()
        if non_null.empty:
            return "text"

        if s.dtype == "object":
            unique_vals = set(non_null.unique())
            if unique_vals.issubset({True, False}) or unique_vals.issubset({"true", "false", "True", "False"}):
                return "boolean"

        # 2. Datetime check (native pandas datetime)
        if pd.api.types.is_datetime64_any_dtype(s):
            return "datetime"

        # 3. Numeric check
        if pd.api.types.is_numeric_dtype(s):
            return "numeric"

        # 4. Safe detection of date-like string columns
        if s.dtype == "object" or pd.api.types.is_string_dtype(s):
            if cls._is_safe_date_column(non_null):
                return "datetime"

        # 5. Categorical vs Free Text
        if isinstance(s.dtype, pd.CategoricalDtype):
            return "categorical"

        total_count = len(non_null)
        unique_count = non_null.nunique()
        str_series = non_null.astype(str).str.strip()
        avg_len = str_series.str.len().mean() if not str_series.empty else 0
        avg_words = str_series.str.split().str.len().mean() if not str_series.empty else 0
        unique_ratio = unique_count / total_count if total_count > 0 else 0.0

        # Text keyword heuristics from column name
        text_keywords = {"note", "notes", "desc", "description", "comment", "comments", "review", "reviews", "text", "message", "bio", "summary", "feedback"}
        clean_col_words = set(col_name.lower().replace("_", " ").replace("-", " ").split())
        if clean_col_words.intersection(text_keywords):
            return "text"

        # Free text indicators: sentence/paragraph structure or long phrases
        if avg_words >= 3.0 or avg_len > 40:
            return "text"

        # High cardinality with multiple words
        if unique_ratio >= 0.8 and (avg_words > 1.5 or avg_len > 20):
            return "text"

        # Discrete categories with low cardinality
        if unique_count <= 100 and (unique_ratio <= 0.5 or total_count <= 20 or avg_words <= 2.0):
            return "categorical"

        return "text"

    @classmethod
    def validate_and_read(cls, file_bytes: bytes, filename: str) -> Tuple[pd.DataFrame, FileMetadata]:
        """
        Validates file size, extension, and reads the tabular data into a Pandas DataFrame.
        """
        ext = Path(filename).suffix.lower()
        if ext not in settings.ALLOWED_UPLOAD_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Please upload CSV, XLSX, XLS, or JSON.",
            )

        size_bytes = len(file_bytes)
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if size_bytes > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File is too large. Maximum allowed size is {settings.MAX_UPLOAD_SIZE_MB} MB.",
            )

        if size_bytes == 0:
            raise HTTPException(
                status_code=400,
                detail="The uploaded dataset is empty.",
            )

        try:
            if ext == ".csv":
                try:
                    df = pd.read_csv(io.BytesIO(file_bytes), encoding="utf-8")
                except UnicodeDecodeError:
                    try:
                        df = pd.read_csv(io.BytesIO(file_bytes), encoding="latin-1")
                    except UnicodeDecodeError:
                        df = pd.read_csv(io.BytesIO(file_bytes), encoding="utf-8-sig")

            elif ext == ".xlsx":
                df = pd.read_excel(io.BytesIO(file_bytes), engine="openpyxl")

            elif ext == ".xls":
                df = pd.read_excel(io.BytesIO(file_bytes), engine="xlrd")

            elif ext == ".json":
                text_content = file_bytes.decode("utf-8", errors="replace")
                parsed_json = json.loads(text_content)
                if isinstance(parsed_json, list):
                    df = pd.json_normalize(parsed_json)
                elif isinstance(parsed_json, dict):
                    matched_key = None
                    for key in ["data", "records", "items", "results", "rows"]:
                        if key in parsed_json and isinstance(parsed_json[key], list):
                            matched_key = key
                            break
                    if matched_key:
                        df = pd.json_normalize(parsed_json[matched_key])
                    else:
                        try:
                            df = pd.read_json(io.StringIO(text_content))
                        except Exception:
                            try:
                                df = pd.DataFrame(parsed_json)
                            except ValueError:
                                df = pd.DataFrame([parsed_json])
                else:
                    raise ValueError("JSON must represent an array of records or tabular object.")
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Unsupported file type. Please upload CSV, XLSX, XLS, or JSON.",
                )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to parse uploaded dataset '{filename}': {e}", exc_info=True)
            raise HTTPException(
                status_code=400,
                detail="Unable to read the uploaded dataset. Please check the file format and contents.",
            )

        if df is None or df.empty or len(df) == 0:
            raise HTTPException(
                status_code=400,
                detail="The uploaded dataset is empty.",
            )

        # Standardize column headers to string
        df.columns = [str(col).strip() for col in df.columns]

        file_metadata = FileMetadata(
            name=filename,
            extension=ext,
            size_bytes=size_bytes,
            size_mb=round(size_bytes / (1024 * 1024), 2),
        )

        return df, file_metadata

    @classmethod
    def profile(cls, df: pd.DataFrame, file_metadata: FileMetadata) -> DatasetProfileResponse:
        """
        Executes full dataset profiling across schema, statistics, semantics, and data quality.
        """
        total_rows = len(df)
        total_cols = len(df.columns)
        total_cells = total_rows * total_cols

        # Dataset dimensions and memory usage
        try:
            mem_bytes = int(df.memory_usage(deep=True).sum())
        except Exception:
            mem_bytes = int(df.memory_usage().sum())
        mem_mb = round(mem_bytes / (1024 * 1024), 2)

        # Duplicate row detection
        try:
            duplicate_rows = int(df.duplicated().sum())
        except TypeError:
            duplicate_rows = int(df.astype(str).duplicated().sum())
        duplicate_pct = round(float(duplicate_rows / total_rows * 100), 2) if total_rows > 0 else 0.0

        # Dataset-level missing values & empty columns
        total_missing = int(df.isna().sum().sum())
        missing_pct = round(float(total_missing / total_cells * 100), 2) if total_cells > 0 else 0.0

        empty_columns: List[str] = []
        numeric_columns: List[str] = []
        categorical_columns: List[str] = []
        datetime_columns: List[str] = []
        boolean_columns: List[str] = []
        text_columns: List[str] = []

        columns_profile: List[ColumnProfile] = []

        for col_name in df.columns:
            s = df[col_name]
            null_count = int(s.isna().sum())
            non_null_count = total_rows - null_count
            null_percentage = round(float(null_count / total_rows * 100), 2) if total_rows > 0 else 0.0
            try:
                unique_count = int(s.nunique(dropna=True))
            except TypeError:
                unique_count = int(s.astype(str).nunique(dropna=True))

            is_empty = (null_count == total_rows)
            if is_empty:
                empty_columns.append(col_name)

            semantic_type = cls.detect_semantic_type(s, col_name=col_name)

            # Categorize into group lists
            if semantic_type == "numeric":
                numeric_columns.append(col_name)
            elif semantic_type == "categorical":
                categorical_columns.append(col_name)
            elif semantic_type == "datetime":
                datetime_columns.append(col_name)
            elif semantic_type == "boolean":
                boolean_columns.append(col_name)
            else:
                text_columns.append(col_name)

            # Calculate numeric stats if numeric
            stats: Optional[NumericStatistics] = None
            if semantic_type == "numeric":
                s_numeric = pd.to_numeric(s, errors="coerce").dropna()
                if not s_numeric.empty:
                    stats = NumericStatistics(
                        count=int(s_numeric.count()),
                        mean=round(float(s_numeric.mean()), 2),
                        median=round(float(s_numeric.median()), 2),
                        std=round(float(s_numeric.std()), 2) if len(s_numeric) > 1 else 0.0,
                        min=round(float(s_numeric.min()), 2),
                        max=round(float(s_numeric.max()), 2),
                        q25=round(float(s_numeric.quantile(0.25)), 2),
                        q75=round(float(s_numeric.quantile(0.75)), 2),
                    )

            # Calculate date bounds if datetime
            date_range: Optional[DateRange] = None
            if semantic_type == "datetime":
                s_dt = pd.to_datetime(s, errors="coerce", format="mixed").dropna()
                if not s_dt.empty:
                    min_dt = s_dt.min()
                    max_dt = s_dt.max()
                    min_fmt = "%Y-%m-%d %H:%M:%S" if (min_dt.hour or min_dt.minute or min_dt.second) else "%Y-%m-%d"
                    max_fmt = "%Y-%m-%d %H:%M:%S" if (max_dt.hour or max_dt.minute or max_dt.second) else "%Y-%m-%d"
                    date_range = DateRange(
                        min=min_dt.strftime(min_fmt),
                        max=max_dt.strftime(max_fmt),
                    )

            # Calculate top frequent values for categorical / text / boolean
            top_values: Optional[List[ValueFrequency]] = None
            if semantic_type in ("categorical", "text", "boolean"):
                try:
                    vc = s.dropna().value_counts().head(10)
                except TypeError:
                    vc = s.dropna().astype(str).value_counts().head(10)
                top_values = [
                    ValueFrequency(
                        value=cls.serialize_value(val),
                        count=int(cnt),
                        percentage=round(float(cnt / total_rows * 100), 2) if total_rows > 0 else 0.0,
                    )
                    for val, cnt in vc.items()
                ]

            col_prof = ColumnProfile(
                name=col_name,
                dtype=str(s.dtype),
                semantic_type=semantic_type,
                non_null_count=non_null_count,
                null_count=null_count,
                null_percentage=null_percentage,
                unique_count=unique_count,
                top_values=top_values,
                statistics=stats,
                date_range=date_range,
            )
            columns_profile.append(col_prof)

        # Preliminary Data Quality Score (0 to 100)
        missing_penalty = missing_pct * 0.5
        duplicate_penalty = duplicate_pct * 0.5
        empty_cols_penalty = (len(empty_columns) / total_cols * 20.0) if total_cols > 0 else 0.0
        raw_score = 100.0 - missing_penalty - duplicate_penalty - empty_cols_penalty
        score = round(max(0.0, min(100.0, raw_score)), 1)

        if score >= 90.0:
            quality_label = "Excellent"
        elif score >= 75.0:
            quality_label = "Good"
        elif score >= 50.0:
            quality_label = "Needs Attention"
        else:
            quality_label = "Poor"

        quality = QualityScore(score=score, label=quality_label)

        # 10-row JSON-safe Preview
        preview_sample = df.head(10)
        preview: List[Dict[str, Any]] = []
        for _, row in preview_sample.iterrows():
            row_dict = {str(col): cls.serialize_value(row[col]) for col in df.columns}
            preview.append(row_dict)

        dataset_overview = DatasetOverview(
            rows=total_rows,
            columns=total_cols,
            memory_usage_bytes=mem_bytes,
            memory_usage_mb=mem_mb,
            duplicate_rows=duplicate_rows,
            duplicate_percentage=duplicate_pct,
        )

        dataset_summary = DatasetSummary(
            total_cells=total_cells,
            total_missing_values=total_missing,
            missing_value_percentage=missing_pct,
            empty_column_count=len(empty_columns),
            empty_columns=empty_columns,
            numeric_columns=numeric_columns,
            categorical_columns=categorical_columns,
            datetime_columns=datetime_columns,
            boolean_columns=boolean_columns,
            text_columns=text_columns,
        )

        profile_data_dict = {
            "file": file_metadata.model_dump(),
            "dataset": dataset_overview.model_dump(),
            "columns": [cp.model_dump() for cp in columns_profile],
            "summary": dataset_summary.model_dump(),
            "quality": quality.model_dump(),
            "preview": preview,
            "numeric_columns": numeric_columns,
            "categorical_columns": categorical_columns,
            "datetime_columns": datetime_columns,
            "boolean_columns": boolean_columns,
            "text_columns": text_columns,
            "empty_columns": empty_columns,
        }

        return DatasetProfileResponse(
            success=True,
            file=file_metadata,
            dataset=dataset_overview,
            columns=columns_profile,
            summary=dataset_summary,
            quality=quality,
            preview=preview,
            numeric_columns=numeric_columns,
            categorical_columns=categorical_columns,
            datetime_columns=datetime_columns,
            boolean_columns=boolean_columns,
            text_columns=text_columns,
            empty_columns=empty_columns,
            data=profile_data_dict,
        )
