from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from backend.app.schemas.common import ApiResponse, FilterParams
from backend.app.api.dependencies import get_filter_params
from backend.app.analytics.insights import InsightsEngine

router = APIRouter(prefix="/insights", tags=["Insights"])

@router.get("", response_model=ApiResponse[Dict[str, List[Dict[str, Any]]]])
def get_insights(params: FilterParams = Depends(get_filter_params)):
    insights = InsightsEngine.generate_insights(params)
    return ApiResponse(
        success=True,
        data={"insights": insights},
        filters=params.model_dump(exclude_none=True)
    )
