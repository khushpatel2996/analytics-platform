from typing import Dict, Any
from fastapi import APIRouter, Depends
from backend.app.schemas.common import ApiResponse, FilterParams
from backend.app.api.dependencies import get_filter_params
from backend.app.analytics.reviews import ReviewAnalytics

router = APIRouter(prefix="/reviews", tags=["Reviews"])

@router.get("/summary", response_model=ApiResponse[Dict[str, Any]])
def get_review_summary(params: FilterParams = Depends(get_filter_params)):
    data = ReviewAnalytics.get_summary(params)
    return ApiResponse(
        success=True,
        data=data,
        filters=params.model_dump(exclude_none=True)
    )
