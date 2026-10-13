// API Common Envelope
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  filters?: Record<string, any>;
  metadata?: Record<string, any>;
  error?: {
    code: string;
    message: string;
  };
}

// Global Filter Parameters
export interface FilterParams {
  date_from?: string;
  date_to?: string;
  year?: number;
  month?: number;
  state?: string;
  city?: string;
  region?: string;
  category?: string;
  product?: string;
  payment_method?: string;
  customer_segment?: string;
  seller?: string;
}

// Common Chart Models
export interface ChartData {
  labels: string[];
  values: number[];
  extra?: Record<string, any>;
}

export interface KeyValueMetric {
  label: string;
  value: number;
  percentage?: number;
  count?: number;
}

// Metadata & Available Filters
export interface MonthOption {
  month: number;
  name: string;
}

export interface FiltersResponse {
  years: number[];
  months: MonthOption[];
  states: string[];
  cities: string[];
  regions: string[];
  categories: string[];
  payment_methods: string[];
  customer_segments: string[];
  order_statuses: string[];
}

export interface MetadataResponse {
  dataset_name: string;
  date_range: {
    min_date: string | null;
    max_date: string | null;
  };
  total_orders_in_db: number;
  total_customers_in_db: number;
  total_products_in_db: number;
  total_sellers_in_db: number;
  total_states_in_db: number;
  total_cities_in_db: number;
  geographic_coverage: string;
  currency: string;
  last_processed_timestamp: string;
}

// Overview KPIs
export interface OverviewKPIs {
  total_revenue: number;
  total_orders: number;
  total_customers: number;
  total_products: number;
  total_sellers: number;
  total_quantity: number;
  average_order_value: number;
  average_order_items: number;
  average_review_score: number;
  cancellation_rate: number;
  delivery_rate: number;
}

export interface OverviewData {
  kpis: OverviewKPIs;
  quick_trends?: Record<string, any>;
  top_categories_preview?: Array<{ category: string; revenue: number }>;
  top_states_preview?: Array<{ state: string; revenue: number }>;
}

// Sales Trends & Breakdowns
export interface TrendItem {
  period: string;
  revenue: number;
  orders: number;
  quantity: number;
  aov: number;
}

export interface SalesTrendData {
  granularity: string;
  trend: TrendItem[];
  chart_data: ChartData;
}

export interface SalesBreakdownData {
  dimension: string;
  items: KeyValueMetric[];
  chart_data: ChartData;
}

// Geography
export interface StateMetric {
  state: string;
  region: string;
  revenue: number;
  orders: number;
  customers: number;
  aov: number;
  percentage_of_total: number;
}

export interface CityMetric {
  city: string;
  state: string;
  region: string;
  revenue: number;
  orders: number;
  aov: number;
}

export interface RegionMetric {
  region: string;
  revenue: number;
  orders: number;
  percentage_of_total: number;
}

export interface GeographyData {
  states: StateMetric[];
  regions: RegionMetric[];
  chart_data: ChartData;
}

// Products
export interface ProductItem {
  product_id: string;
  category: string;
  revenue: number;
  quantity: number;
  orders_count: number;
  average_price: number;
}

export interface CategoryItem {
  category: string;
  revenue: number;
  quantity: number;
  orders_count: number;
  average_price: number;
  percentage_of_revenue: number;
}

export interface ProductsData {
  metric: string;
  limit: number;
  items: ProductItem[];
  chart_data: ChartData;
}

export interface CategoriesData {
  items: CategoryItem[];
  chart_data: ChartData;
}

// Customers & Segmentation
export interface CustomerSummaryData {
  total_customers: number;
  repeat_customers: number;
  repeat_customer_rate: number;
  average_spend_per_customer: number;
  acquisition_trend: ChartData;
}

export interface TopCustomerItem {
  customer_unique_id: string;
  orders_count: number;
  total_spend: number;
  state: string;
  city: string;
}

export interface ClusterMetric {
  cluster_id: number;
  segment_name: string;
  segment_size: number;
  percentage_of_customers: number;
  average_revenue: number;
  average_frequency: number;
  average_recency: number;
  total_revenue: number;
}

export interface RfmSegmentItem {
  segment: string;
  count: number;
  percentage: number;
}

export interface CustomerSegmentsData {
  total_customers_segmented: number;
  silhouette_score: number;
  clusters: ClusterMetric[];
  rfm_segments: RfmSegmentItem[];
}

// Sellers
export interface SellerItem {
  seller_id: string;
  city: string;
  state: string;
  revenue: number;
  orders_count: number;
  items_sold: number;
}

export interface SellersTopData {
  total_sellers: number;
  sellers: SellerItem[];
  chart_data: {
    labels: string[];
    values: number[];
  };
}

export interface SellerGeographyItem {
  state?: string;
  region?: string;
  seller_count: number;
  revenue: number;
}

export interface SellerGeographyData {
  by_state: Array<{ state: string; seller_count: number; revenue: number }>;
  by_region: Array<{ region: string; seller_count: number; revenue: number }>;
}

// Payments
export interface PaymentDistributionItem {
  payment_type: string;
  revenue: number;
  order_count: number;
  share_percentage: number;
}

export interface PaymentSummaryData {
  total_payment_value: number;
  total_transactions: number;
  distribution: PaymentDistributionItem[];
  chart_data: {
    labels: string[];
    values: number[];
    counts?: number[];
  };
  trend: {
    periods: string[];
    series: Record<string, number[]>;
  };
}

// Reviews
export interface RatingDistributionItem {
  stars: number;
  count: number;
  percentage: number;
}

export interface ReviewSummaryData {
  average_rating: number;
  total_reviews: number;
  rating_distribution: RatingDistributionItem[];
  chart_data: {
    labels: string[];
    values: number[];
  };
  by_category: Array<{
    category: string;
    average_rating: number;
    reviews_count: number;
    revenue: number;
  }>;
  by_state: Array<{
    state: string;
    average_rating: number;
    reviews_count: number;
  }>;
  correlation_with_revenue: number;
}

// Insights
export interface InsightItem {
  type: string;
  title: string;
  description: string;
  metric: string;
  value: number;
}

export interface InsightsData {
  insights: InsightItem[];
}

// Upload & Dataset Profiling
export interface FileMetadata {
  name: string;
  extension: string;
  size_bytes: number;
  size_mb: number;
}

export interface DatasetOverview {
  rows: number;
  columns: number;
  memory_usage_bytes: number;
  memory_usage_mb: number;
  duplicate_rows: number;
  duplicate_percentage: number;
}

export interface ValueFrequency {
  value: any;
  count: number;
  percentage: number;
}

export interface NumericStatistics {
  count: number;
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  q25: number;
  q75: number;
}

export interface DateRange {
  min: string | null;
  max: string | null;
}

export interface ColumnProfile {
  name: string;
  dtype: string;
  semantic_type: 'numeric' | 'categorical' | 'datetime' | 'boolean' | 'text' | string;
  non_null_count: number;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  top_values?: ValueFrequency[] | null;
  statistics?: NumericStatistics | null;
  date_range?: DateRange | null;
}

export interface QualityScore {
  score: number;
  label: 'Excellent' | 'Good' | 'Needs Attention' | 'Poor' | string;
}

export interface DatasetSummary {
  total_cells: number;
  total_missing_values: number;
  missing_value_percentage: number;
  empty_column_count: number;
  empty_columns: string[];
  numeric_columns: string[];
  categorical_columns: string[];
  datetime_columns: string[];
  boolean_columns: string[];
  text_columns: string[];
}

export interface DatasetProfileResponse {
  success: boolean;
  file: FileMetadata;
  dataset: DatasetOverview;
  columns: ColumnProfile[];
  summary: DatasetSummary;
  quality: QualityScore;
  preview: Array<Record<string, any>>;
  numeric_columns: string[];
  categorical_columns: string[];
  datetime_columns: string[];
  boolean_columns: string[];
  text_columns: string[];
  empty_columns: string[];
  data?: any;
}

// Dataset Intelligence Engine Types
export interface DetectedColumn {
  name: string;
  dtype: string;
  type: 'numeric' | 'categorical' | 'datetime' | 'boolean' | 'text' | 'identifier' | string;
  semantic_role?: string | null;
  confidence: number;
  is_identifier: boolean;
  details?: string | null;
}

export interface DatasetCapabilities {
  kpis: boolean;
  time_series: boolean;
  categorical_distribution: boolean;
  rankings: boolean;
  correlations: boolean;
  outliers: boolean;
  geography: boolean;
  group_comparisons: boolean;
}

export interface DynamicModuleCandidate {
  id: string;
  title: string;
  description: string;
  icon: string;
  priority: number;
  category: 'core' | 'domain' | 'statistical' | string;
}

export interface MetricStatistics {
  count: number;
  total?: number | null;
  average?: number | null;
  median?: number | null;
  min?: number | null;
  max?: number | null;
  std_dev?: number | null;
  q25?: number | null;
  q75?: number | null;
  iqr?: number | null;
}

export interface MetricSummary {
  available: boolean;
  column: string;
  label: string;
  semantic_role?: string | null;
  statistics: MetricStatistics;
}

export interface TimeSeriesPoint {
  period: string;
  value: number;
  count: number;
}

export interface TrendsAnalytics {
  available: boolean;
  date_column?: string | null;
  metric_column?: string | null;
  metric_label?: string | null;
  granularity?: string | null;
  data: TimeSeriesPoint[];
  total_periods: number;
  start_period?: string | null;
  end_period?: string | null;
  peak_period?: string | null;
  peak_value?: number | null;
}

export interface CategoryShare {
  category: string;
  count: number;
  percentage: number;
  total_metric?: number | null;
  average_metric?: number | null;
}

export interface DistributionDimension {
  column: string;
  label: string;
  unique_count: number;
  categories: CategoryShare[];
}

export interface DistributionsAnalytics {
  available: boolean;
  dimensions: DistributionDimension[];
}

export interface RankingItem {
  rank: number;
  name: string;
  value: number;
  percentage?: number | null;
}

export interface EntityRanking {
  entity_column: string;
  label: string;
  metric_column: string;
  metric_label: string;
  items: RankingItem[];
}

export interface RankingsAnalytics {
  available: boolean;
  rankings: EntityRanking[];
}

export interface CorrelationPair {
  col1: string;
  col2: string;
  correlation: number;
}

export interface CorrelationsAnalytics {
  available: boolean;
  columns: string[];
  matrix: Record<string, Record<string, number | null>>;
  strongest_positive?: CorrelationPair | null;
  strongest_negative?: CorrelationPair | null;
}

export interface OutlierMetric {
  column: string;
  label: string;
  total_count: number;
  outlier_count: number;
  outlier_percentage: number;
  q1: number;
  q3: number;
  iqr: number;
  lower_bound: number;
  upper_bound: number;
  min_outlier?: number | null;
  max_outlier?: number | null;
}

export interface OutlierInspectionRecord {
  id: string;
  row_index: number;
  entity_name?: string | null;
  column: string;
  column_label: string;
  value: number;
  expected_lower: number;
  expected_upper: number;
  severity: 'Low' | 'Medium' | 'High' | string;
  reason: string;
  dimensions: Record<string, any>;
}

export interface OutlierOverview {
  total_anomalies: number;
  affected_features: number;
  total_features: number;
  anomaly_rate: number;
  most_affected_feature?: string | null;
  highest_anomaly_rate: number;
  affected_records?: number | null;
}

export interface OutlierFeatureSummary {
  column: string;
  label: string;
  outlier_count: number;
  outlier_percentage: number;
  median?: number | null;
  typical_range: string;
  severity: 'Low' | 'Medium' | 'High' | string;
  q1: number;
  q3: number;
  iqr: number;
  lower_bound: number;
  upper_bound: number;
}

export interface OutliersAnalytics {
  available: boolean;
  results: OutlierMetric[];
  overview?: OutlierOverview | null;
  top_features?: OutlierFeatureSummary[];
  inspections?: OutlierInspectionRecord[];
}

export interface GeographicPoint {
  location: string;
  count: number;
  total_metric?: number | null;
  average_metric?: number | null;
}

export interface GeographyDimension {
  column: string;
  label: string;
  locations: GeographicPoint[];
}

export interface GeographyAnalytics {
  available: boolean;
  dimensions: GeographyDimension[];
}

export interface ColumnQualityItem {
  column: string;
  type: string;
  missing_count: number;
  missing_percentage: number;
  unique_count: number;
  unique_percentage: number;
}

export interface DataQualityAnalytics {
  score: number;
  label: string;
  total_rows: number;
  total_columns: number;
  total_missing_values: number;
  missing_value_percentage: number;
  duplicate_rows: number;
  duplicate_percentage: number;
  columns: ColumnQualityItem[];
}

export interface DynamicKPI {
  id: string;
  label: string;
  value: any;
  formatted_value: string;
  subtitle?: string | null;
  icon?: string | null;
  category?: string | null;
}

export interface OverviewAnalytics {
  kpis: DynamicKPI[];
}

export interface DatasetAnalytics {
  overview: OverviewAnalytics;
  primary_metric?: MetricSummary | null;
  value_metric?: MetricSummary | null;
  trends: TrendsAnalytics;
  distributions: DistributionsAnalytics;
  rankings: RankingsAnalytics;
  geography: GeographyAnalytics;
  correlations: CorrelationsAnalytics;
  outliers: OutliersAnalytics;
  data_quality: DataQualityAnalytics;
  insights: string[];
  why_this_matters?: Record<string, string>;
}

export interface FilterOptionItem {
  value: string;
  count: number;
}

export interface ColumnFilterOption {
  column: string;
  label: string;
  type: 'categorical' | 'numeric' | 'datetime' | 'boolean' | string;
  is_primary: boolean;
  options?: FilterOptionItem[];
  min_value?: number | null;
  max_value?: number | null;
  min_date?: string | null;
  max_date?: string | null;
}

export interface DatasetAnalysisResponse {
  success: boolean;
  file: FileMetadata;
  dataset: DatasetOverview;
  profile: DatasetProfileResponse;
  detected_columns: DetectedColumn[];
  semantic_roles: Record<string, string[]>;
  capabilities: DatasetCapabilities;
  modules: DynamicModuleCandidate[];
  analytics?: DatasetAnalytics | null;
  dataset_id?: string | null;
  available_filters?: ColumnFilterOption[];
  data?: any;
}

export interface DatasetFilterRequest {
  dataset_id: string;
  filters: Record<string, any>;
}

export interface DatasetFilterResponse {
  success: boolean;
  dataset_id: string;
  total_rows: number;
  filtered_rows: number;
  percentage_of_total: number;
  is_filtered: boolean;
  active_filters_summary: string[];
  analytics: DatasetAnalytics;
  available_filters: ColumnFilterOption[];
}

export interface SegmentMetricStats {
  mean: number;
  median: number;
  sum: number;
  min: number;
  max: number;
  std?: number | null;
}

export interface SegmentData {
  name: string;
  rows: number;
  percentage_of_total: number;
  metrics: Record<string, SegmentMetricStats>;
}

export interface MetricComparisonDetail {
  metric: string;
  metric_label: string;
  a_mean: number;
  b_mean: number;
  mean_difference: number;
  mean_percent_change: number;
  a_median: number;
  b_median: number;
  a_sum: number;
  b_sum: number;
  sum_difference: number;
  sum_percent_change: number;
  a_min: number;
  b_min: number;
  a_max: number;
  b_max: number;
}

export interface SegmentComparisonRequest {
  dataset_id: string;
  dimension: string;
  segment_a: string;
  segment_b: string;
}

export interface SegmentComparisonResponse {
  success: boolean;
  dimension: string;
  dimension_label: string;
  segment_a: SegmentData;
  segment_b: SegmentData;
  metrics: MetricComparisonDetail[];
  takeaways: string[];
}

export interface MultiDatasetProfileItem {
  dataset_id: string;
  filename: string;
  file_type: string;
  rows: number;
  columns: number;
  profile: DatasetProfileResponse;
  analysis?: DatasetAnalysisResponse;
}

export interface MultiDatasetProfileResponse {
  success: boolean;
  dataset_count: number;
  datasets: MultiDatasetProfileItem[];
}

export interface RelationshipSignals {
  name_similarity: number;
  type_compatible: boolean;
  value_overlap: number;
  left_unique: boolean;
  right_unique: boolean;
  left_null_rate: number;
  right_null_rate: number;
  left_unique_values: number;
  right_unique_values: number;
  overlap_unique_values: number;
  overlap_percentage_left: number;
  overlap_percentage_right: number;
}

export interface RelationshipCandidate {
  relationship_id: string;
  left_dataset: string;
  left_dataset_id?: string | null;
  left_column: string;
  right_dataset: string;
  right_dataset_id?: string | null;
  right_column: string;
  relationship_type: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many' | string;
  confidence: number;
  match_level: 'Strong Match' | 'Possible Match' | 'Weak Match' | string;
  signals: RelationshipSignals;
  explanation: string[];
  status: 'suggested' | 'accepted' | 'rejected';
}

export interface RelationshipDetectionResponse {
  success: boolean;
  dataset_count: number;
  relationship_count: number;
  relationships: RelationshipCandidate[];
}

export interface DataModelDataset {
  dataset_id: string;
  filename: string;
  rows: number;
  columns: number;
  unique_keys: string[];
  relationship_keys: string[];
  all_columns: string[];
}

export interface DataModelRelationship {
  relationship_id: string;
  left_dataset: string;
  left_dataset_id?: string | null;
  left_column: string;
  right_dataset: string;
  right_dataset_id?: string | null;
  right_column: string;
  relationship_type: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many' | string;
  confidence: number;
  status: string;
  validation_status: 'valid' | 'warning' | 'invalid' | string;
  validation_notes: string[];
}

export interface ConnectedComponentGroup {
  group_id: string;
  name: string;
  datasets: string[];
  relationship_ids: string[];
}

export interface DataModelSummary {
  dataset_count: number;
  relationship_count: number;
  connected_components: number;
  independent_count: number;
  status: 'valid' | 'warning' | 'invalid' | string;
}

export interface DataModelResponse {
  success: boolean;
  model_id: string;
  status: 'valid' | 'warning' | 'invalid' | string;
  datasets: DataModelDataset[];
  relationships: DataModelRelationship[];
  connected_components: ConnectedComponentGroup[];
  independent_datasets: DataModelDataset[];
  warnings: string[];
  errors: string[];
  summary: DataModelSummary;
}

export interface DataModelBuildRequest {
  accepted_relationships: RelationshipCandidate[];
  dataset_ids?: string[] | null;
}

export interface ValidateRelationshipRequest {
  left_dataset: string;
  left_column: string;
  right_dataset: string;
  right_column: string;
  relationship_type: string;
}

export interface ValidateRelationshipResponse {
  valid: boolean;
  status: string;
  notes: string[];
  candidate?: RelationshipCandidate | null;
}

// ==========================================
// Phase 4: Cross-Dataset Analytics Types
// ==========================================

export interface CrossDatasetKPI {
  id: string;
  label: string;
  value: any;
  formatted_value: string;
  subtitle?: string | null;
  dataset?: string | null;
  column?: string | null;
  category: 'volume' | 'financial' | 'average' | 'temporal' | 'count' | string;
}

export interface CrossDatasetRankingItem {
  label: string;
  value: number;
  formatted_value: string;
  percentage: number;
  secondary_value?: number | null;
  secondary_label?: string | null;
}

export interface CrossDatasetRanking {
  id: string;
  title: string;
  dimension_dataset: string;
  dimension_column: string;
  metric_dataset: string;
  metric_column: string;
  join_path: string[];
  items: CrossDatasetRankingItem[];
  total_items: number;
  explanation: string;
}

export interface HowCalculatedInfo {
  datasets_used: string[];
  relationships_used: string[];
  join_type: string;
  formula: string;
  primary_records: number;
}

export interface CrossDatasetAnalysisCard {
  id: string;
  title: string;
  description: string;
  primary_dimension: string;
  primary_metric: string;
  datasets_involved: string[];
  join_path_summary: string;
  chart_type: 'bar' | 'donut' | 'table' | 'line' | string;
  data: Record<string, any>[];
  how_calculated: HowCalculatedInfo;
}

export interface RelationshipHealthItem {
  relationship_id: string;
  left_dataset: string;
  left_column: string;
  right_dataset: string;
  right_column: string;
  relationship_type: string;
  total_left_keys: number;
  total_right_keys: number;
  matched_keys: number;
  matched_percentage: number;
  unmatched_count: number;
  unmatched_percentage: number;
  duplicate_parent_keys: number;
  status: 'healthy' | 'warning' | 'critical' | string;
  notes: string[];
}

export interface CrossDatasetTrendPoint {
  date: string;
  value: number;
  secondary_value?: number | null;
  count?: number | null;
}

export interface CrossDatasetTrend {
  metric_name: string;
  date_column: string;
  dataset: string;
  granularity: 'day' | 'week' | 'month' | 'year' | string;
  points: CrossDatasetTrendPoint[];
}

export interface CrossDatasetInsight {
  type: 'positive' | 'neutral' | 'attention' | 'metric' | string;
  text: string;
  dataset?: string | null;
  category: 'performance' | 'integrity' | 'volume' | 'distribution' | string;
}

export interface CrossDatasetGroupAnalytics {
  group_id: string;
  name: string;
  datasets: string[];
  relationships: string[];
  kpis: CrossDatasetKPI[];
  trends?: CrossDatasetTrend | null;
  has_time_dimension: boolean;
  rankings: CrossDatasetRanking[];
  analyses: CrossDatasetAnalysisCard[];
  available_dimensions: Array<{
    dataset: string;
    column: string;
    distinct_count: number;
    label: string;
  }>;
  available_metrics: Array<{
    dataset: string;
    column: string;
    label: string;
  }>;
  available_date_fields?: Array<{
    dataset: string;
    column: string;
    label: string;
    role: string;
    is_event_date: boolean;
    description: string;
  }>;
  available_geo_dimensions?: Array<{
    dataset: string;
    column: string;
    label: string;
    distinct_count: number;
  }>;
  has_event_date?: boolean;
  has_geo_dimension?: boolean;
  relationship_health: RelationshipHealthItem[];
  insights: CrossDatasetInsight[];
  data_quality_summary: {
    dataset_count: number;
    total_rows: number;
    healthy_links: number;
  };
}

export interface CrossDatasetAnalyticsResponse {
  success: boolean;
  model_id: string;
  active_group_id: string;
  groups: CrossDatasetGroupAnalytics[];
  independent_datasets: Array<{
    dataset_id: string;
    filename: string;
    rows: number;
    columns: number;
    status: string;
  }>;
  warnings: string[];
}

export interface CrossDatasetTrendRequest {
  group_id?: string | null;
  date_dataset: string;
  date_column: string;
  metric_dataset?: string | null;
  metric_column?: string | null;
  granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year' | string;
  filters?: Record<string, any> | null;
}

export interface CrossDatasetQueryRequest {
  group_id?: string | null;
  dimension_dataset: string;
  dimension_column: string;
  metric_dataset: string;
  metric_column: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | string;
  filters?: Record<string, any> | null;
  limit?: number;
}

export interface CrossDatasetQueryResponse {
  success: boolean;
  title: string;
  dimension: string;
  metric: string;
  aggregation: string;
  join_path: string[];
  items: CrossDatasetRankingItem[];
  how_calculated: HowCalculatedInfo;
}


