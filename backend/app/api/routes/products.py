from fastapi import APIRouter, Depends, Query
from backend.app.schemas.common import ApiResponse, FilterParams
from backend.app.schemas.products import ProductsData, CategoriesData
from backend.app.api.dependencies import get_filter_params
from backend.app.analytics.products import ProductAnalytics

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("/top", response_model=ApiResponse[ProductsData])
def get_top_products(
    metric: str = Query("revenue", description="Ranking metric: revenue, quantity, orders"),
    limit: int = Query(10, ge=1, le=100),
    params: FilterParams = Depends(get_filter_params)
):
    data = ProductAnalytics.get_top_products(params, metric=metric, limit=limit)
    return ApiResponse(
        success=True,
        data=data,
        filters=params.model_dump(exclude_none=True)
    )

@router.get("/categories", response_model=ApiResponse[CategoriesData])
def get_categories(
    limit: int = Query(25, ge=1, le=100),
    params: FilterParams = Depends(get_filter_params)
):
    data = ProductAnalytics.get_categories(params, limit=limit)
    return ApiResponse(
        success=True,
        data=data,
        filters=params.model_dump(exclude_none=True)
    )

@router.get("/performance", response_model=ApiResponse[ProductsData])
def get_product_performance(
    metric: str = Query("revenue"),
    limit: int = Query(20, ge=1, le=100),
    params: FilterParams = Depends(get_filter_params)
):
    data = ProductAnalytics.get_top_products(params, metric=metric, limit=limit)
    return ApiResponse(
        success=True,
        data=data,
        filters=params.model_dump(exclude_none=True)
    )
