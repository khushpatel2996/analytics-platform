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


class MultiDatasetProfileItem(BaseModel):
    dataset_id: str = Field(..., description="Unique, safe dataset identifier")
    filename: str = Field(..., description="Uploaded file name")
    file_type: str = Field(..., description="File extension (e.g. .csv, .xlsx)")
    rows: int = Field(..., description="Number of rows in the dataset")
    columns: int = Field(..., description="Number of columns in the dataset")
    profile: DatasetProfileResponse = Field(..., description="Detailed profile of the individual dataset")
    analysis: Optional[Any] = Field(default=None, description="Detailed generic intelligence analysis for the individual dataset")


class MultiDatasetProfileResponse(BaseModel):
    success: bool = True
    dataset_count: int = Field(..., description="Total count of successfully profiled datasets")
    datasets: List[MultiDatasetProfileItem] = Field(..., description="List of dataset profiles")


class RelationshipSignals(BaseModel):
    name_similarity: float = Field(..., description="Normalized column name similarity score (0.0 to 1.0)")
    type_compatible: bool = Field(..., description="Whether data types can be joined or compared")
    value_overlap: float = Field(..., description="Maximum ratio of non-null value overlap (0.0 to 1.0)")
    left_unique: bool = Field(..., description="Whether left column contains unique non-null values")
    right_unique: bool = Field(..., description="Whether right column contains unique non-null values")
    left_null_rate: float = Field(..., description="Missing value ratio in left column (0.0 to 1.0)")
    right_null_rate: float = Field(..., description="Missing value ratio in right column (0.0 to 1.0)")
    left_unique_values: int = Field(default=0, description="Count of distinct values in left column")
    right_unique_values: int = Field(default=0, description="Count of distinct values in right column")
    overlap_unique_values: int = Field(default=0, description="Count of shared distinct values")
    overlap_percentage_left: float = Field(default=0.0, description="Overlap percentage relative to left unique values")
    overlap_percentage_right: float = Field(default=0.0, description="Overlap percentage relative to right unique values")


class RelationshipCandidate(BaseModel):
    relationship_id: str = Field(..., description="Unique identifier for this suggested relationship")
    left_dataset: str = Field(..., description="Source dataset filename or display name")
    left_dataset_id: Optional[str] = Field(None, description="Source dataset identifier")
    left_column: str = Field(..., description="Source column name")
    right_dataset: str = Field(..., description="Target dataset filename or display name")
    right_dataset_id: Optional[str] = Field(None, description="Target dataset identifier")
    right_column: str = Field(..., description="Target column name")
    relationship_type: str = Field(..., description="Cardinality: one_to_one, one_to_many, many_to_one, or many_to_many")
    confidence: int = Field(..., description="Overall confidence score from 0 to 100")
    match_level: str = Field(..., description="Classification: Strong Match, Possible Match, or Weak Match")
    signals: RelationshipSignals = Field(..., description="Individual detection signal evaluations")
    explanation: List[str] = Field(..., description="Human-readable business rationale for why this relationship was detected")
    status: str = Field(default="suggested", description="Review status: suggested, accepted, or rejected")


class RelationshipDetectionRequest(BaseModel):
    dataset_ids: Optional[List[str]] = Field(None, description="List of cached dataset IDs to evaluate")


class RelationshipDetectionResponse(BaseModel):
    success: bool = True
    dataset_count: int = Field(..., description="Number of datasets evaluated")
    relationship_count: int = Field(..., description="Number of detected candidate relationships")
    relationships: List[RelationshipCandidate] = Field(..., description="Candidate relationships sorted by confidence descending")


class DataModelDataset(BaseModel):
    dataset_id: str = Field(..., description="Unique dataset identifier")
    filename: str = Field(..., description="Uploaded filename")
    rows: int = Field(..., description="Total row count")
    columns: int = Field(..., description="Total column count")
    unique_keys: List[str] = Field(default_factory=list, description="Columns acting as unique/primary key in relationships")
    relationship_keys: List[str] = Field(default_factory=list, description="Columns acting as foreign/relationship key in relationships")
    all_columns: List[str] = Field(default_factory=list, description="List of all available column names")


class DataModelRelationship(BaseModel):
    relationship_id: str = Field(..., description="Unique relationship identifier")
    left_dataset: str = Field(..., description="Source dataset filename")
    left_dataset_id: Optional[str] = Field(None, description="Source dataset identifier")
    left_column: str = Field(..., description="Source column name")
    right_dataset: str = Field(..., description="Target dataset filename")
    right_dataset_id: Optional[str] = Field(None, description="Target dataset identifier")
    right_column: str = Field(..., description="Target column name")
    relationship_type: str = Field(..., description="Cardinality: one_to_one, one_to_many, many_to_one, or many_to_many")
    confidence: int = Field(default=100, description="Confidence score")
    status: str = Field(default="accepted", description="Relationship acceptance status")
    validation_status: str = Field(default="valid", description="valid, warning, or invalid")
    validation_notes: List[str] = Field(default_factory=list, description="Explanations of validation results")


class ConnectedComponentGroup(BaseModel):
    group_id: str = Field(..., description="Unique group identifier")
    name: str = Field(..., description="Human-friendly component group name")
    datasets: List[str] = Field(..., description="List of dataset filenames in this group")
    relationship_ids: List[str] = Field(..., description="List of relationship IDs linking this group")


class DataModelSummary(BaseModel):
    dataset_count: int = Field(..., description="Total datasets count")
    relationship_count: int = Field(..., description="Total relationships count")
    connected_components: int = Field(..., description="Number of connected groups")
    independent_count: int = Field(..., description="Number of orphan/independent datasets")
    status: str = Field(..., description="Overall model status: valid, warning, or invalid")


class DataModelResponse(BaseModel):
    success: bool = True
    model_id: str = Field(..., description="Unique data model identifier")
    status: str = Field(..., description="valid, warning, or invalid")
    datasets: List[DataModelDataset] = Field(..., description="All datasets included in model")
    relationships: List[DataModelRelationship] = Field(..., description="Validated relationships")
    connected_components: List[ConnectedComponentGroup] = Field(..., description="Connected groups")
    independent_datasets: List[DataModelDataset] = Field(default_factory=list, description="Datasets with zero relationships")
    warnings: List[str] = Field(default_factory=list, description="Model-level warnings")
    errors: List[str] = Field(default_factory=list, description="Model-level validation errors")
    summary: DataModelSummary = Field(..., description="Compact metrics summary")


class DataModelBuildRequest(BaseModel):
    accepted_relationships: List[RelationshipCandidate] = Field(default_factory=list, description="List of user-accepted relationship candidates")
    dataset_ids: Optional[List[str]] = Field(None, description="Optional cached dataset IDs")


class ValidateRelationshipRequest(BaseModel):
    left_dataset: str = Field(..., description="Left dataset filename or ID")
    left_column: str = Field(..., description="Left column name")
    right_dataset: str = Field(..., description="Right dataset filename or ID")
    right_column: str = Field(..., description="Right column name")
    relationship_type: str = Field(..., description="one_to_one, one_to_many, many_to_one, or many_to_many")



