from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from backend.app.schemas.upload import FileMetadata, DatasetOverview, DatasetProfileResponse


class DetectedColumn(BaseModel):
    name: str = Field(..., description="Column header name")
    dtype: str = Field(..., description="Native pandas data type")
    type: str = Field(
        ...,
        description="Core technical classification: numeric, categorical, datetime, boolean, text, or identifier",
    )
    semantic_role: Optional[str] = Field(
        None,
        description="High-level detected role: monetary_value, quantity, product, category, customer, employee, student, geography, department, payment_method, score, rating, status, date, or identifier",
    )
    confidence: float = Field(
        0.0,
        ge=0.0,
        le=1.0,
        description="Confidence score for the semantic role from 0.0 to 1.0",
    )
    is_identifier: bool = Field(
        False,
        description="Whether this column serves as an entity ID, primary key, or high-cardinality index",
    )
    details: Optional[str] = Field(
        None,
        description="Explanatory notes regarding how this column was classified",
    )


class DatasetCapabilities(BaseModel):
    kpis: bool = Field(True, description="Basic aggregates and dataset counts are feasible")
    time_series: bool = Field(False, description="At least one temporal date dimension exists")
    categorical_distribution: bool = Field(False, description="Discrete groupings/classes exist")
    rankings: bool = Field(False, description="Entity rankings by quantitative metric are feasible")
    correlations: bool = Field(False, description="Multivariate relationship analysis across 2+ numerics")
    outliers: bool = Field(False, description="Continuous numeric anomaly/outlier detection")
    geography: bool = Field(False, description="Spatial coordinates or state/city geographic fields exist")
    group_comparisons: bool = Field(False, description="Segment comparisons across numeric measures")


class DynamicModuleCandidate(BaseModel):
    id: str = Field(..., description="Unique module slug (e.g., 'overview', 'trends', 'academic-performance')")
    title: str = Field(..., description="Display title for the sidebar and page header")
    description: str = Field(..., description="Brief description of analytical value provided")
    icon: str = Field(..., description="Lucide icon identifier (e.g., 'layout-dashboard', 'trending-up')")
    priority: int = Field(1, description="Sort order for sidebar and module navigation")
    category: str = Field("core", description="Module category: core, domain, or statistical")


# --- Detailed Statistical Analytics Schemas ---

class MetricStatistics(BaseModel):
    count: int = 0
    total: Optional[float] = None
    average: Optional[float] = None
    median: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    std_dev: Optional[float] = None
    q25: Optional[float] = None
    q75: Optional[float] = None
    iqr: Optional[float] = None


class MetricSummary(BaseModel):
    available: bool = True
    column: str
    label: str
    semantic_role: Optional[str] = None
    statistics: MetricStatistics


class TimeSeriesPoint(BaseModel):
    period: str
    value: float
    count: int


class TrendsAnalytics(BaseModel):
    available: bool = False
    date_column: Optional[str] = None
    metric_column: Optional[str] = None
    metric_label: Optional[str] = None
    granularity: Optional[str] = None
    data: List[TimeSeriesPoint] = []
    total_periods: int = 0
    start_period: Optional[str] = None
    end_period: Optional[str] = None
    peak_period: Optional[str] = None
    peak_value: Optional[float] = None


class CategoryShare(BaseModel):
    category: str
    count: int
    percentage: float
    total_metric: Optional[float] = None
    average_metric: Optional[float] = None


class DistributionDimension(BaseModel):
    column: str
    label: str
    unique_count: int
    categories: List[CategoryShare] = []


class DistributionsAnalytics(BaseModel):
    available: bool = False
    dimensions: List[DistributionDimension] = []


class RankingItem(BaseModel):
    rank: int
    name: str
    value: float
    percentage: Optional[float] = None


class EntityRanking(BaseModel):
    entity_column: str
    label: str
    metric_column: str
    metric_label: str
    items: List[RankingItem] = []


class RankingsAnalytics(BaseModel):
    available: bool = False
    rankings: List[EntityRanking] = []


class CorrelationPair(BaseModel):
    col1: str
    col2: str
    correlation: float


class CorrelationsAnalytics(BaseModel):
    available: bool = False
    columns: List[str] = []
    matrix: Dict[str, Dict[str, Optional[float]]] = {}
    strongest_positive: Optional[CorrelationPair] = None
    strongest_negative: Optional[CorrelationPair] = None


class OutlierMetric(BaseModel):
    column: str
    label: str
    total_count: int
    outlier_count: int
    outlier_percentage: float
    q1: float
    q3: float
    iqr: float
    lower_bound: float
    upper_bound: float
    min_outlier: Optional[float] = None
    max_outlier: Optional[float] = None


class OutlierInspectionRecord(BaseModel):
    id: str
    row_index: int
    entity_name: Optional[str] = None
    column: str
    column_label: str
    value: float
    expected_lower: float
    expected_upper: float
    severity: str  # 'Low', 'Medium', 'High'
    reason: str
    dimensions: Dict[str, Any] = {}


class OutlierOverview(BaseModel):
    total_anomalies: int = 0
    affected_features: int = 0
    total_features: int = 0
    anomaly_rate: float = 0.0
    most_affected_feature: Optional[str] = None
    highest_anomaly_rate: float = 0.0
    affected_records: Optional[int] = None


class OutlierFeatureSummary(BaseModel):
    column: str
    label: str
    outlier_count: int
    outlier_percentage: float
    median: Optional[float] = None
    typical_range: str
    severity: str
    q1: float
    q3: float
    iqr: float
    lower_bound: float
    upper_bound: float


class OutliersAnalytics(BaseModel):
    available: bool = False
    results: List[OutlierMetric] = []
    overview: Optional[OutlierOverview] = None
    top_features: List[OutlierFeatureSummary] = []
    inspections: List[OutlierInspectionRecord] = []


class GeographicPoint(BaseModel):
    location: str
    count: int
    total_metric: Optional[float] = None
    average_metric: Optional[float] = None


class GeographyDimension(BaseModel):
    column: str
    label: str
    locations: List[GeographicPoint] = []


class GeographyAnalytics(BaseModel):
    available: bool = False
    dimensions: List[GeographyDimension] = []


class ColumnQualityItem(BaseModel):
    column: str
    type: str
    missing_count: int
    missing_percentage: float
    unique_count: int
    unique_percentage: float


class DataQualityAnalytics(BaseModel):
    score: float
    label: str
    total_rows: int
    total_columns: int
    total_missing_values: int
    missing_value_percentage: float
    duplicate_rows: int
    duplicate_percentage: float
    columns: List[ColumnQualityItem] = []


class DynamicKPI(BaseModel):
    id: str
    label: str
    value: Any
    formatted_value: str
    subtitle: Optional[str] = None
    icon: Optional[str] = None
    category: Optional[str] = None


class OverviewAnalytics(BaseModel):
    kpis: List[DynamicKPI] = []


class DatasetAnalytics(BaseModel):
    overview: OverviewAnalytics
    primary_metric: Optional[MetricSummary] = None
    value_metric: Optional[MetricSummary] = None
    trends: TrendsAnalytics = Field(default_factory=TrendsAnalytics)
    distributions: DistributionsAnalytics = Field(default_factory=DistributionsAnalytics)
    rankings: RankingsAnalytics = Field(default_factory=RankingsAnalytics)
    geography: GeographyAnalytics = Field(default_factory=GeographyAnalytics)
    correlations: CorrelationsAnalytics = Field(default_factory=CorrelationsAnalytics)
    outliers: OutliersAnalytics = Field(default_factory=OutliersAnalytics)
    data_quality: DataQualityAnalytics
    insights: List[str] = []
    why_this_matters: Dict[str, str] = Field(default_factory=dict)


class FilterOptionItem(BaseModel):
    value: str
    count: int


class ColumnFilterOption(BaseModel):
    column: str
    label: str
    type: str  # 'categorical', 'numeric', 'datetime', 'boolean'
    is_primary: bool = False
    options: List[FilterOptionItem] = []
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    min_date: Optional[str] = None
    max_date: Optional[str] = None


class DatasetAnalysisResponse(BaseModel):
    success: bool = True
    file: FileMetadata
    dataset: DatasetOverview
    profile: DatasetProfileResponse
    detected_columns: List[DetectedColumn]
    semantic_roles: Dict[str, List[str]]
    capabilities: DatasetCapabilities
    modules: List[DynamicModuleCandidate]
    analytics: Optional[DatasetAnalytics] = None
    dataset_id: Optional[str] = None
    available_filters: List[ColumnFilterOption] = Field(default_factory=list)
    data: Optional[Dict[str, Any]] = None


class DatasetFilterRequest(BaseModel):
    dataset_id: str
    filters: Dict[str, Any] = Field(default_factory=dict)
    primary_metric: Optional[str] = None


class DatasetFilterResponse(BaseModel):
    success: bool = True
    dataset_id: str
    total_rows: int
    filtered_rows: int
    percentage_of_total: float
    is_filtered: bool
    active_filters_summary: List[str] = Field(default_factory=list)
    analytics: DatasetAnalytics
    available_filters: List[ColumnFilterOption] = Field(default_factory=list)


class SegmentMetricStats(BaseModel):
    mean: float = 0.0
    median: float = 0.0
    sum: float = 0.0
    min: float = 0.0
    max: float = 0.0
    std: Optional[float] = None


class SegmentData(BaseModel):
    name: str
    rows: int
    percentage_of_total: float
    metrics: Dict[str, SegmentMetricStats] = Field(default_factory=dict)


class MetricComparisonDetail(BaseModel):
    metric: str
    metric_label: str
    a_mean: float
    b_mean: float
    mean_difference: float
    mean_percent_change: float
    a_median: float
    b_median: float
    a_sum: float
    b_sum: float
    sum_difference: float
    sum_percent_change: float
    a_min: float
    b_min: float
    a_max: float
    b_max: float


class SegmentComparisonRequest(BaseModel):
    dataset_id: str
    dimension: str
    segment_a: str
    segment_b: str


class SegmentComparisonResponse(BaseModel):
    success: bool = True
    dimension: str
    dimension_label: str
    segment_a: SegmentData
    segment_b: SegmentData
    metrics: List[MetricComparisonDetail] = Field(default_factory=list)
    takeaways: List[str] = Field(default_factory=list)
