from typing import Generic, TypeVar, Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field

T = TypeVar("T")

class ErrorDetail(BaseModel):
    code: str
    message: str

class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class ApiErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail

class FilterParams(BaseModel):
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    year: Optional[int] = None
    month: Optional[int] = None
    state: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    category: Optional[str] = None
    product: Optional[str] = None
    payment_method: Optional[str] = None
    customer_segment: Optional[str] = None
    seller: Optional[str] = None

class ChartData(BaseModel):
    labels: List[str]
    values: List[Union[int, float]]
    extra: Optional[Dict[str, Any]] = None

class KeyValueMetric(BaseModel):
    label: str
    value: Union[int, float]
    percentage: Optional[float] = None
    count: Optional[int] = None

class FiltersResponse(BaseModel):
    years: List[int]
    months: List[Dict[str, Any]]
    states: List[str]
    cities: List[str]
    regions: List[str]
    categories: List[str]
    payment_methods: List[str]
    customer_segments: List[str]
    order_statuses: List[str]

class MetadataResponse(BaseModel):
    dataset_name: str
    date_range: Dict[str, Optional[str]]
    total_orders_in_db: int
    total_customers_in_db: int
    total_products_in_db: int
    total_sellers_in_db: int
    total_states_in_db: int
    total_cities_in_db: int
    geographic_coverage: str
    currency: str
    last_processed_timestamp: str
