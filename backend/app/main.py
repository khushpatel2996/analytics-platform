import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.analytics.data_service import data_service
from backend.app.api.routes import (
    overview_router,
    sales_router,
    geography_router,
    products_router,
    customers_router,
    sellers_router,
    payments_router,
    reviews_router,
    insights_router,
    filters_router,
    upload_router
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown events.
    Loads processed data into the analytical memory service once on startup.
    """
    logger.info("Initializing India Sales Analytics API backend...")
    data_service.initialize()
    yield
    logger.info("Shutting down India Sales Analytics API backend...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-grade REST API backend for India Sales Analytics & Business Intelligence Dashboard.",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS configuration for Lovable React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS if settings.ALLOWED_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware for request logging and response time header
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    return response

# Custom Exception Handlers for consistent API error responses
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        err_detail = exc.detail
        detail_msg = exc.detail.get("message", str(exc.detail))
    else:
        err_detail = {"code": "HTTP_ERROR", "message": str(exc.detail)}
        detail_msg = str(exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": err_detail, "detail": detail_msg}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": str(exc.errors())
            }
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred while processing the request."
            }
        }
    )

# Include All Routers
app.include_router(filters_router, prefix=settings.API_PREFIX)
app.include_router(overview_router, prefix=settings.API_PREFIX)
app.include_router(sales_router, prefix=settings.API_PREFIX)
app.include_router(geography_router, prefix=settings.API_PREFIX)
app.include_router(products_router, prefix=settings.API_PREFIX)
app.include_router(customers_router, prefix=settings.API_PREFIX)
app.include_router(sellers_router, prefix=settings.API_PREFIX)
app.include_router(payments_router, prefix=settings.API_PREFIX)
app.include_router(reviews_router, prefix=settings.API_PREFIX)
app.include_router(insights_router, prefix=settings.API_PREFIX)
app.include_router(upload_router, prefix=settings.API_PREFIX)

@app.get("/")
def root():
    return {
        "message": "Welcome to India Sales Analytics & Business Intelligence Dashboard API",
        "docs": "/docs",
        "health": f"{settings.API_PREFIX}/health",
        "overview": f"{settings.API_PREFIX}/overview",
        "filters": f"{settings.API_PREFIX}/filters"
    }
