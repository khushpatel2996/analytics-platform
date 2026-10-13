from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CrossDatasetKPI(BaseModel):
    id: str = Field(..., description="Unique KPI identifier")
    label: str = Field(..., description="Human-friendly KPI label")
    value: Any = Field(..., description="Raw scalar value (numeric or string)")
    formatted_value: str = Field(..., description="Display-ready formatted value")
    subtitle: Optional[str] = Field(None, description="Contextual subtitle or note")
    dataset: Optional[str] = Field(None, description="Source dataset filename")
    column: Optional[str] = Field(None, description="Source column name")
    category: str = Field(default="volume", description="volume, financial, average, temporal, count")


class CrossDatasetRankingItem(BaseModel):
    label: str = Field(..., description="Entity or dimension name")
    value: float = Field(..., description="Numeric metric value")
    formatted_value: str = Field(..., description="Formatted string value")
    percentage: float = Field(..., description="Share of total (0 to 100)")
    secondary_value: Optional[float] = Field(None, description="Secondary metric value if any")
    secondary_label: Optional[str] = Field(None, description="Secondary metric formatted label")


class CrossDatasetRanking(BaseModel):
    id: str = Field(..., description="Unique ranking identifier")
    title: str = Field(..., description="Human-readable ranking title")
    dimension_dataset: str = Field(..., description="Dataset containing dimension")
    dimension_column: str = Field(..., description="Dimension column name")
    metric_dataset: str = Field(..., description="Dataset containing metric")
    metric_column: str = Field(..., description="Metric column name")
    join_path: List[str] = Field(default_factory=list, description="Sequence of datasets in join path")
    items: List[CrossDatasetRankingItem] = Field(default_factory=list, description="Ranked items")
    total_items: int = Field(default=0, description="Total unique items in dimension")
    explanation: str = Field(default="", description="Description of ranking logic")


class HowCalculatedInfo(BaseModel):
    datasets_used: List[str] = Field(default_factory=list, description="Datasets involved in analysis")
    relationships_used: List[str] = Field(default_factory=list, description="Relationship paths used")
    join_type: str = Field(default="LEFT JOIN", description="Join type used")
    formula: str = Field(default="", description="Aggregation formula used")
    primary_records: int = Field(default=0, description="Records evaluated")


class CrossDatasetAnalysisCard(BaseModel):
    id: str = Field(..., description="Unique analysis card identifier")
    title: str = Field(..., description="Title of the analysis")
    description: str = Field(..., description="Brief description")
    primary_dimension: str = Field(..., description="Dimension analyzed")
    primary_metric: str = Field(..., description="Metric analyzed")
    datasets_involved: List[str] = Field(default_factory=list, description="Datasets joined")
    join_path_summary: str = Field(default="", description="Human-readable path summary")
    chart_type: str = Field(default="bar", description="bar, donut, table, line")
    data: List[Dict[str, Any]] = Field(default_factory=list, description="Chart/table rows")
    how_calculated: HowCalculatedInfo = Field(..., description="Calculation transparency details")


class RelationshipHealthItem(BaseModel):
    relationship_id: str = Field(..., description="Unique relationship identifier")
    left_dataset: str = Field(..., description="Parent/Source dataset")
    left_column: str = Field(..., description="Parent/Source key")
    right_dataset: str = Field(..., description="Child/Target dataset")
    right_column: str = Field(..., description="Child/Target key")
    relationship_type: str = Field(..., description="Cardinality (one_to_many, etc.)")
    total_left_keys: int = Field(..., description="Total non-null left keys")
    total_right_keys: int = Field(..., description="Total non-null right keys")
    matched_keys: int = Field(..., description="Distinct keys matched")
    matched_percentage: float = Field(..., description="Percentage of right records matched to left (0 to 100)")
    unmatched_count: int = Field(..., description="Count of unmatched records")
    unmatched_percentage: float = Field(..., description="Percentage of unmatched records")
    duplicate_parent_keys: int = Field(default=0, description="Duplicates in parent unique key")
    status: str = Field(default="healthy", description="healthy, warning, critical")
    notes: List[str] = Field(default_factory=list, description="Health notes and observations")


class CrossDatasetTrendPoint(BaseModel):
    date: str = Field(..., description="Date / Period string")
    value: float = Field(..., description="Primary metric value")
    secondary_value: Optional[float] = Field(None, description="Optional secondary value")
    count: Optional[int] = Field(None, description="Count of records")


class CrossDatasetTrend(BaseModel):
    metric_name: str = Field(..., description="Name of trending metric")
    date_column: str = Field(..., description="Date column name")
    dataset: str = Field(..., description="Source dataset for date")
    granularity: str = Field(default="month", description="day, week, month, year")
    points: List[CrossDatasetTrendPoint] = Field(default_factory=list, description="Trend series")


class CrossDatasetInsight(BaseModel):
    type: str = Field(default="metric", description="positive, neutral, attention, metric")
    text: str = Field(..., description="Factual insight statement")
    dataset: Optional[str] = Field(None, description="Related dataset")
    category: str = Field(default="performance", description="performance, integrity, volume, distribution")


class CrossDatasetGroupAnalytics(BaseModel):
    group_id: str = Field(..., description="Connected component group ID")
    name: str = Field(..., description="Human-friendly group title")
    datasets: List[str] = Field(..., description="List of dataset filenames in this group")
    relationships: List[str] = Field(..., description="List of relationship IDs")
    kpis: List[CrossDatasetKPI] = Field(default_factory=list, description="Cross-dataset KPIs")
    trends: Optional[CrossDatasetTrend] = Field(None, description="Time trend series if date exists")
    has_time_dimension: bool = Field(default=False, description="Whether date dimension was detected")
    rankings: List[CrossDatasetRanking] = Field(default_factory=list, description="Cross-dataset rankings")
    analyses: List[CrossDatasetAnalysisCard] = Field(default_factory=list, description="Cross-dataset analysis cards")
    available_dimensions: List[Dict[str, Any]] = Field(default_factory=list, description="Eligible dimensions for explorer")
    available_metrics: List[Dict[str, Any]] = Field(default_factory=list, description="Eligible metrics for explorer")
    available_date_fields: List[Dict[str, Any]] = Field(default_factory=list, description="Available date fields with semantic roles")
    available_geo_dimensions: List[Dict[str, Any]] = Field(default_factory=list, description="Available geographic dimensions")
    has_event_date: bool = Field(default=False, description="Whether a true business event date exists")
    has_geo_dimension: bool = Field(default=False, description="Whether a geographic dimension exists")
    relationship_health: List[RelationshipHealthItem] = Field(default_factory=list, description="Integrity of links")
    insights: List[CrossDatasetInsight] = Field(default_factory=list, description="Factual insights")
    data_quality_summary: Dict[str, Any] = Field(default_factory=dict, description="Summary quality stats")


class CrossDatasetAnalyticsResponse(BaseModel):
    success: bool = True
    model_id: str = Field(..., description="Data Model identifier")
    active_group_id: str = Field(..., description="Currently selected group ID")
    groups: List[CrossDatasetGroupAnalytics] = Field(..., description="Analytics for each connected group")
    independent_datasets: List[Dict[str, Any]] = Field(default_factory=list, description="Orphan datasets with 0 links")
    warnings: List[str] = Field(default_factory=list, description="System or join warnings")


class CrossDatasetTrendRequest(BaseModel):
    group_id: Optional[str] = Field(None, description="Connected group ID")
    date_dataset: str = Field(..., description="Dataset providing date column")
    date_column: str = Field(..., description="Date column name")
    metric_dataset: Optional[str] = Field(None, description="Dataset providing metric column")
    metric_column: Optional[str] = Field(None, description="Metric column name or None for row count")
    granularity: str = Field(default="month", description="day, week, month, quarter, year")
    filters: Optional[Dict[str, Any]] = Field(default=None, description="Optional active filters")


class CrossDatasetQueryRequest(BaseModel):
    group_id: Optional[str] = Field(None, description="Connected group ID")
    dimension_dataset: str = Field(..., description="Dataset for dimension")
    dimension_column: str = Field(..., description="Column for dimension")
    metric_dataset: str = Field(..., description="Dataset for metric")
    metric_column: str = Field(..., description="Column for metric")
    aggregation: str = Field(default="sum", description="sum, avg, count, min, max")
    filters: Optional[Dict[str, Any]] = Field(default=None, description="Active filters")
    limit: int = Field(default=10, description="Max results to return")


class CrossDatasetQueryResponse(BaseModel):
    success: bool = True
    title: str = Field(..., description="Query result title")
    dimension: str = Field(..., description="Dimension column name")
    metric: str = Field(..., description="Metric column name")
    aggregation: str = Field(default="sum", description="Aggregation applied")
    join_path: List[str] = Field(default_factory=list, description="Path taken")
    items: List[CrossDatasetRankingItem] = Field(default_factory=list, description="Aggregated items")
    how_calculated: HowCalculatedInfo = Field(..., description="Transparency details")

