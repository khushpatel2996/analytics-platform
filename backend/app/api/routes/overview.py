from fastapi import APIRouter, Depends
from backend.app.schemas.common import ApiResponse, FilterParams
from backend.app.schemas.overview import OverviewData
from backend.app.api.dependencies import get_filter_params
from backend.app.analytics.overview import OverviewAnalytics

router = APIRouter(prefix="/overview", tags=["Overview"])

@router.get("", response_model=ApiResponse[OverviewData])
def get_overview(params: FilterParams = Depends(get_filter_params)):
    data = OverviewAnalytics.get_overview(params)
    return ApiResponse(
        success=True,
        data=data,
        filters=params.model_dump(exclude_none=True)
    )
