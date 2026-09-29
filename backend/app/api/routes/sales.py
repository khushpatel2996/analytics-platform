from fastapi import APIRouter, Depends, Query
from backend.app.schemas.common import ApiResponse, FilterParams
from backend.app.schemas.sales import SalesTrendData, SalesBreakdownData
from backend.app.api.dependencies import get_filter_params
from backend.app.analytics.sales import SalesAnalytics

router = APIRouter(prefix="/sales", tags=["Sales"])

@router.get("/trend", response_model=ApiResponse[SalesTrendData])
def get_sales_trend(
    granularity: str = Query("month", description="Granularity: day, week, month, quarter, year"),
    params: FilterParams = Depends(get_filter_params)
):
    data = SalesAnalytics.get_trend(params, granularity=granularity)
    return ApiResponse(
        success=True,
        data=data,
        filters=params.model_dump(exclude_none=True)
    )

@router.get("/category", response_model=ApiResponse[SalesBreakdownData])
def get_sales_by_category(
    limit: int = Query(15, ge=1, le=100),
    params: FilterParams = Depends(get_filter_params)
):
    data = SalesAnalytics.get_breakdown(params, dimension="category", limit=limit)
    return ApiResponse(
        success=True,
        data=data,
        filters=params.model_dump(exclude_none=True)
    )

@router.get("/state", response_model=ApiResponse[SalesBreakdownData])
def get_sales_by_state(
    limit: int = Query(25, ge=1, le=100),
    params: FilterParams = Depends(get_filter_params)
):
    data = SalesAnalytics.get_breakdown(params, dimension="state", limit=limit)
    return ApiResponse(
        success=True,
        data=data,
        filters=params.model_dump(exclude_none=True)
    )

@router.get("/city", response_model=ApiResponse[SalesBreakdownData])
def get_sales_by_city(
    limit: int = Query(20, ge=1, le=100),
    params: FilterParams = Depends(get_filter_params)
):
    data = SalesAnalytics.get_breakdown(params, dimension="city", limit=limit)
    return ApiResponse(
        success=True,
        data=data,
        filters=params.model_dump(exclude_none=True)
    )

@router.get("/payment", response_model=ApiResponse[SalesBreakdownData])
def get_sales_by_payment(params: FilterParams = Depends(get_filter_params)):
    data = SalesAnalytics.get_breakdown(params, dimension="payment")
    return ApiResponse(
        success=True,
        data=data,
        filters=params.model_dump(exclude_none=True)
    )
