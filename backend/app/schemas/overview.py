from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from backend.app.schemas.common import ChartData

class OverviewKPIs(BaseModel):
    total_revenue: float
    total_orders: int
    total_customers: int
    total_products: int
    total_sellers: int
    total_quantity: int
    average_order_value: float
    average_order_items: float
    average_review_score: float
    cancellation_rate: float
    delivery_rate: float

class OverviewData(BaseModel):
    kpis: OverviewKPIs
    quick_trends: Dict[str, Any] = {}
    top_categories_preview: List[Dict[str, Any]] = []
    top_states_preview: List[Dict[str, Any]] = []
