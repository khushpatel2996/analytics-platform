from backend.app.api.routes.overview import router as overview_router
from backend.app.api.routes.sales import router as sales_router
from backend.app.api.routes.geography import router as geography_router
from backend.app.api.routes.products import router as products_router
from backend.app.api.routes.customers import router as customers_router
from backend.app.api.routes.sellers import router as sellers_router
from backend.app.api.routes.payments import router as payments_router
from backend.app.api.routes.reviews import router as reviews_router
from backend.app.api.routes.insights import router as insights_router
from backend.app.api.routes.filters import router as filters_router
from backend.app.api.routes.upload import router as upload_router

__all__ = [
    "overview_router",
    "sales_router",
    "geography_router",
    "products_router",
    "customers_router",
    "sellers_router",
    "payments_router",
    "reviews_router",
    "insights_router",
    "filters_router",
    "upload_router"
]
