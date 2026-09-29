from typing import List
from fastapi import APIRouter, Depends, Query
from backend.app.schemas.common import ApiResponse, FilterParams
from backend.app.schemas.geography import GeographyData, CityMetric
from backend.app.api.dependencies import get_filter_params
from backend.app.analytics.geography import GeographyAnalytics

router = APIRouter(prefix="/geography", tags=["Geography"])

@router.get("/states", response_model=ApiResponse[GeographyData])
def get_state_analytics(params: FilterParams = Depends(get_filter_params)):
    data = GeographyAnalytics.get_state_analytics(params)
    return ApiResponse(
        success=True,
        data=data,
        filters=params.model_dump(exclude_none=True)
    )

@router.get("/cities", response_model=ApiResponse[List[CityMetric]])
def get_city_analytics(
    limit: int = Query(25, ge=1, le=100),
    params: FilterParams = Depends(get_filter_params)
):
    data = GeographyAnalytics.get_city_analytics(params, limit=limit)
    return ApiResponse(
        success=True,
        data=data,
        filters=params.model_dump(exclude_none=True)
    )
