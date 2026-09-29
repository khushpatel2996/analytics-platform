from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class FileMetadata(BaseModel):
    name: str = Field(..., description="Uploaded file name")
    extension: str = Field(..., description="File extension with dot (e.g. .csv)")
    size_bytes: int = Field(..., description="File size in bytes")
    size_mb: float = Field(..., description="File size in megabytes")


class DatasetOverview(BaseModel):
    rows: int = Field(..., description="Total row count")
    columns: int = Field(..., description="Total column count")
    memory_usage_bytes: int = Field(..., description="In-memory dataset footprint in bytes")
    memory_usage_mb: float = Field(..., description="In-memory dataset footprint in MB")
    duplicate_rows: int = Field(..., description="Number of fully duplicate rows")
    duplicate_percentage: float = Field(..., description="Percentage of fully duplicate rows")


class ValueFrequency(BaseModel):
    value: Any = Field(..., description="Distinct value")
    count: int = Field(..., description="Frequency count")
    percentage: float = Field(..., description="Percentage of total rows")


class NumericStatistics(BaseModel):
    count: int = Field(..., description="Non-null value count")
    mean: float = Field(..., description="Mean / average value")
    median: float = Field(..., description="Median (50th percentile)")
    std: float = Field(..., description="Standard deviation")
    min: float = Field(..., description="Minimum value")
    max: float = Field(..., description="Maximum value")
    q25: float = Field(..., description="25th percentile (Q1)")
    q75: float = Field(..., description="75th percentile (Q3)")


class DateRange(BaseModel):
    min: Optional[str] = Field(None, description="Earliest date found (ISO formatted)")
    max: Optional[str] = Field(None, description="Latest date found (ISO formatted)")


class ColumnProfile(BaseModel):
    name: str = Field(..., description="Column header name")
    dtype: str = Field(..., description="Native pandas data type representation")
    semantic_type: str = Field(..., description="Detected semantic category: numeric, categorical, datetime, boolean, or text")
    non_null_count: int = Field(..., description="Count of non-null cells")
    null_count: int = Field(..., description="Count of missing/null cells")
    null_percentage: float = Field(..., description="Percentage of missing values in this column")
    unique_count: int = Field(..., description="Count of distinct non-null values")
    top_values: Optional[List[ValueFrequency]] = Field(default=None, description="Top 10 frequent values for categoricals/text")
    statistics: Optional[NumericStatistics] = Field(default=None, description="Statistical summary for numeric columns")
    date_range: Optional[DateRange] = Field(default=None, description="Date bounds for datetime columns")


class QualityScore(BaseModel):
    score: float = Field(..., description="Dataset quality score from 0.0 to 100.0")
    label: str = Field(..., description="Quality rating label: Excellent, Good, Needs Attention, or Poor")


class DatasetSummary(BaseModel):
    total_cells: int = Field(..., description="Total cell count (rows * columns)")
    total_missing_values: int = Field(..., description="Total missing cells across all columns")
    missing_value_percentage: float = Field(..., description="Overall missing cell percentage")
    empty_column_count: int = Field(..., description="Count of columns with 100% missing values")
    empty_columns: List[str] = Field(default_factory=list, description="Names of columns that are completely empty")
    numeric_columns: List[str] = Field(default_factory=list, description="List of numeric column names")
    categorical_columns: List[str] = Field(default_factory=list, description="List of categorical column names")
    datetime_columns: List[str] = Field(default_factory=list, description="List of datetime column names")
    boolean_columns: List[str] = Field(default_factory=list, description="List of boolean column names")
    text_columns: List[str] = Field(default_factory=list, description="List of text column names")


class DatasetProfileResponse(BaseModel):
    success: bool = True
    file: FileMetadata
    dataset: DatasetOverview
    columns: List[ColumnProfile]
    summary: DatasetSummary
    quality: QualityScore
    preview: List[Dict[str, Any]]
    numeric_columns: List[str]
    categorical_columns: List[str]
    datetime_columns: List[str]
    boolean_columns: List[str]
    text_columns: List[str]
    empty_columns: List[str]
    data: Optional[Dict[str, Any]] = None
