from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel
from backend.app.schemas.common import ChartData, KeyValueMetric

class TrendItem(BaseModel):
    period: str
    revenue: float
    orders: int
    quantity: int
    aov: float

class SalesTrendData(BaseModel):
    granularity: str
    trend: List[TrendItem]
    chart_data: ChartData

class SalesBreakdownData(BaseModel):
    dimension: str
    items: List[KeyValueMetric]
    chart_data: ChartData
