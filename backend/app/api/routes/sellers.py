from typing import Dict, Any
from fastapi import APIRouter, Depends, Query
from backend.app.schemas.common import ApiResponse, FilterParams
from backend.app.api.dependencies import get_filter_params
from backend.app.analytics.sellers import SellerAnalytics

router = APIRouter(prefix="/sellers", tags=["Sellers"])

@router.get("/top", response_model=ApiResponse[Dict[str, Any]])
def get_top_sellers(
    limit: int = Query(10, ge=1, le=100),
    params: FilterParams = Depends(get_filter_params)
):
    data = SellerAnalytics.get_top_sellers(params, limit=limit)
    return ApiResponse(
        success=True,
        data=data,
        filters=params.model_dump(exclude_none=True)
    )

@router.get("/geography", response_model=ApiResponse[Dict[str, Any]])
def get_seller_geography(params: FilterParams = Depends(get_filter_params)):
    data = SellerAnalytics.get_seller_geography(params)
    return ApiResponse(
        success=True,
        data=data,
        filters=params.model_dump(exclude_none=True)
    )
