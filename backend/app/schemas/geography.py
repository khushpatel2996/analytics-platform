from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from backend.app.schemas.common import ChartData

class StateMetric(BaseModel):
    state: str
    region: str
    revenue: float
    orders: int
    customers: int
    aov: float
    percentage_of_total: float

class CityMetric(BaseModel):
    city: str
    state: str
    region: str
    revenue: float
    orders: int
    aov: float

class RegionMetric(BaseModel):
    region: str
    revenue: float
    orders: int
    percentage_of_total: float

class GeographyData(BaseModel):
    states: List[StateMetric]
    regions: List[RegionMetric]
    chart_data: ChartData
