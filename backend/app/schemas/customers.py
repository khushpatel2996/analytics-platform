from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from backend.app.schemas.common import ChartData

class ClusterMetric(BaseModel):
    cluster_id: int
    segment_name: str
    segment_size: int
    percentage_of_customers: float
    average_revenue: float
    average_frequency: float
    average_recency: float
    total_revenue: float

class CustomerSummaryData(BaseModel):
    total_customers: int
    repeat_customers: int
    repeat_customer_rate: float
    average_spend_per_customer: float
    acquisition_trend: ChartData

class TopCustomerItem(BaseModel):
    customer_unique_id: str
    orders_count: int
    total_spend: float
    state: str
    city: str

class CustomerSegmentsData(BaseModel):
    total_customers_segmented: int
    silhouette_score: float
    clusters: List[ClusterMetric]
    rfm_segments: List[Dict[str, Any]]
