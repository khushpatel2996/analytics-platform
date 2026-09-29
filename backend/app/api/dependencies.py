from typing import Optional
from fastapi import Query, HTTPException
from backend.app.schemas.common import FilterParams
from backend.app.utils.validation import validate_date_range

def get_filter_params(
    date_from: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    date_to: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    year: Optional[int] = Query(None, description="Specific calendar year (e.g. 2017, 2018)"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Month of year (1-12)"),
    state: Optional[str] = Query(None, description="Customer Indian State (e.g. Gujarat, Andhra Pradesh)"),
    city: Optional[str] = Query(None, description="Customer City"),
    region: Optional[str] = Query(None, description="Indian Region (North, South, East, West, Central, Northeast)"),
    category: Optional[str] = Query(None, description="Product category name"),
    product: Optional[str] = Query(None, description="Product ID"),
    payment_method: Optional[str] = Query(None, description="Payment type (credit_card, upi, voucher, debit_card)"),
    customer_segment: Optional[str] = Query(None, description="Customer RFM / KMeans segment"),
    seller: Optional[str] = Query(None, description="Seller ID")
) -> FilterParams:
    """
    FastAPI dependency that extracts, validates, and packages all query filter parameters.
    """
    try:
        d_from, d_to = validate_date_range(date_from, date_to)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_FILTER", "message": str(e)}
        )

    return FilterParams(
        date_from=d_from,
        date_to=d_to,
        year=year,
        month=month,
        state=state,
        city=city,
        region=region,
        category=category,
        product=product,
        payment_method=payment_method,
        customer_segment=customer_segment,
        seller=seller
    )
