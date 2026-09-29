from typing import Dict, Any
from fastapi import APIRouter, Depends
from backend.app.schemas.common import ApiResponse, FilterParams
from backend.app.api.dependencies import get_filter_params
from backend.app.analytics.payments import PaymentAnalytics

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.get("/summary", response_model=ApiResponse[Dict[str, Any]])
def get_payment_summary(params: FilterParams = Depends(get_filter_params)):
    data = PaymentAnalytics.get_summary(params)
    return ApiResponse(
        success=True,
        data=data,
        filters=params.model_dump(exclude_none=True)
    )
