from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import APIRouter
from backend.app.schemas.common import ApiResponse, FiltersResponse, MetadataResponse
from backend.app.analytics.data_service import data_service
from backend.app.core.config import settings

router = APIRouter(tags=["Metadata & Filters"])

@router.get("/health")
def health_check():
    loaded = len(data_service.fact_orders)
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "data_loaded": loaded > 0,
        "total_orders_available": loaded,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@router.get("/filters", response_model=ApiResponse[FiltersResponse])
def get_filter_options():
    df = data_service.fact_orders
    if df.empty:
        return ApiResponse(
            success=True,
            data=FiltersResponse(
                years=[],
                months=[],
                states=[],
                cities=[],
                regions=[],
                categories=[],
                payment_methods=[],
                customer_segments=[],
                order_statuses=[]
            )
        )

    years = sorted([int(y) for y in df["year"].dropna().unique()])
    months = [
        {"month": 1, "name": "Jan"}, {"month": 2, "name": "Feb"},
        {"month": 3, "name": "Mar"}, {"month": 4, "name": "Apr"},
        {"month": 5, "name": "May"}, {"month": 6, "name": "Jun"},
        {"month": 7, "name": "Jul"}, {"month": 8, "name": "Aug"},
        {"month": 9, "name": "Sep"}, {"month": 10, "name": "Oct"},
        {"month": 11, "name": "Nov"}, {"month": 12, "name": "Dec"}
    ]
    states = sorted([str(s) for s in df["customer_state"].dropna().unique() if str(s) != "Unknown"])
    # Return top 100 cities by order volume for clean dropdown response
    cities = df["customer_city"].value_counts().head(100).index.tolist()
    regions = sorted([str(r) for r in df["customer_region"].dropna().unique() if str(r) != "Other"])
    categories = sorted([str(c) for c in df["category"].dropna().unique() if str(c) not in ["Others", "Unknown"]])
    payments = sorted([str(p) for p in df["primary_payment_type"].dropna().unique()])
    statuses = sorted([str(s) for s in df["order_status"].dropna().unique()])

    customer_segments = [
        "Champions", "Loyal Customers", "Potential Loyalists",
        "New Customers", "At Risk", "Needs Attention", "Promising"
    ]

    return ApiResponse(
        success=True,
        data=FiltersResponse(
            years=years,
            months=months,
            states=states,
            cities=cities,
            regions=regions,
            categories=categories,
            payment_methods=payments,
            customer_segments=customer_segments,
            order_statuses=statuses
        )
    )

@router.get("/metadata", response_model=ApiResponse[MetadataResponse])
def get_metadata():
    df = data_service.fact_orders
    items_df = data_service.fact_order_items

    min_date = df["date_only"].min() if not df.empty and "date_only" in df.columns else None
    max_date = df["date_only"].max() if not df.empty and "date_only" in df.columns else None

    return ApiResponse(
        success=True,
        data=MetadataResponse(
            dataset_name="E-Commerce Project - Marketing Analytics (Indian E-Commerce)",
            date_range={"min_date": min_date, "max_date": max_date},
            total_orders_in_db=len(df),
            total_customers_in_db=int(df["customer_unique_id"].nunique()) if not df.empty else 0,
            total_products_in_db=int(items_df["product_id"].nunique()) if not items_df.empty else 0,
            total_sellers_in_db=int(items_df["seller_id"].nunique()) if not items_df.empty else 0,
            total_states_in_db=int(df["customer_state"].nunique()) if not df.empty else 0,
            total_cities_in_db=int(df["customer_city"].nunique()) if not df.empty else 0,
            geographic_coverage="India (20 States/UTs, 4,119 Cities across North, South, East, West, Central, Northeast)",
            currency="INR (₹)",
            last_processed_timestamp=datetime.now(timezone.utc).isoformat()
        )
    )
