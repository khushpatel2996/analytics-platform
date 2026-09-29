from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from backend.app.schemas.common import ChartData

class ProductItem(BaseModel):
    product_id: str
    category: str
    revenue: float
    quantity: int
    orders_count: int
    average_price: float

class CategoryItem(BaseModel):
    category: str
    revenue: float
    quantity: int
    orders_count: int
    average_price: float
    percentage_of_revenue: float

class ProductsData(BaseModel):
    metric: str
    limit: int
    items: List[ProductItem]
    chart_data: ChartData

class CategoriesData(BaseModel):
    items: List[CategoryItem]
    chart_data: ChartData
