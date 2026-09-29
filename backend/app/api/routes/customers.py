from typing import List
from fastapi import APIRouter, Depends, Query
from backend.app.schemas.common import ApiResponse, FilterParams
from backend.app.schemas.customers import CustomerSummaryData, CustomerSegmentsData, TopCustomerItem
from backend.app.api.dependencies import get_filter_params
from backend.app.analytics.customers import CustomerAnalytics

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("/summary", response_model=ApiResponse[CustomerSummaryData])
def get_customer_summary(params: FilterParams = Depends(get_filter_params)):
    data = CustomerAnalytics.get_summary(params)
    return ApiResponse(
        success=True,
        data=data,
        filters=params.model_dump(exclude_none=True)
    )

@router.get("/top", response_model=ApiResponse[List[TopCustomerItem]])
def get_top_customers(
    limit: int = Query(10, ge=1, le=100),
    params: FilterParams = Depends(get_filter_params)
):
    data = CustomerAnalytics.get_top_customers(params, limit=limit)
    return ApiResponse(
        success=True,
        data=data,
        filters=params.model_dump(exclude_none=True)
    )

@router.get("/segments", response_model=ApiResponse[CustomerSegmentsData])
def get_customer_segments():
    data = CustomerAnalytics.get_segments()
    return ApiResponse(
        success=True,
        data=data
    )
