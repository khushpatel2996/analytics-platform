import json
from typing import Any, Dict, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from backend.app.analytics.dataset_cache import DatasetCacheService, dataset_cache
from backend.app.analytics.dataset_intelligence import DatasetIntelligenceEngine
from backend.app.analytics.dataset_profiler import DatasetProfiler
from backend.app.analytics.statistical_calculator import StatisticalCalculator
from backend.app.schemas.intelligence import (
    DatasetAnalysisResponse,
    DatasetFilterRequest,
    DatasetFilterResponse,
    SegmentComparisonRequest,
    SegmentComparisonResponse,
)
from backend.app.schemas.upload import DatasetProfileResponse

router = APIRouter(prefix="/upload", tags=["Upload & Profiling"])


@router.post(
    "/profile",
    response_model=DatasetProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload and profile arbitrary tabular dataset",
    description=(
        "Upload a dataset in CSV, Excel (.xlsx, .xls), or JSON format up to 50 MB. "
        "Returns a complete profile with column types, statistics, missing values, "
        "duplicates, data quality score, and a 10-row JSON-safe preview."
    ),
)
async def upload_and_profile(
    file: UploadFile = File(..., description="Tabular data file (CSV, XLSX, XLS, JSON)"),
) -> DatasetProfileResponse:
    file_bytes = await file.read()
    filename = file.filename or "uploaded_dataset"

    # Validate file type, size, and parse into DataFrame
    df, file_metadata = DatasetProfiler.validate_and_read(
        file_bytes=file_bytes,
        filename=filename,
    )

    # Perform full dataset profiling
    return DatasetProfiler.profile(df=df, file_metadata=file_metadata)


@router.post(
    "/analyze",
    response_model=DatasetAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload, profile, and perform deep dataset intelligence analysis",
    description=(
        "Upload a dataset in CSV, Excel (.xlsx, .xls), or JSON format up to 50 MB. "
        "Performs technical column typing, entity semantic role detection, analytical "
        "capabilities evaluation, and dynamic module candidate generation."
    ),
)
async def upload_and_analyze(
    file: UploadFile = File(..., description="Tabular data file (CSV, XLSX, XLS, JSON)"),
) -> DatasetAnalysisResponse:
    file_bytes = await file.read()
    filename = file.filename or "uploaded_dataset"

    # Validate file type, size, and parse into DataFrame
    df, file_metadata = DatasetProfiler.validate_and_read(
        file_bytes=file_bytes,
        filename=filename,
    )

    # Perform full dataset profiling
    profile = DatasetProfiler.profile(df=df, file_metadata=file_metadata)

    # Perform dataset intelligence analysis
    return DatasetIntelligenceEngine.analyze(df=df, profile=profile, file_metadata=file_metadata)


@router.post(
    "/filter",
    response_model=DatasetFilterResponse,
    status_code=status.HTTP_200_OK,
    summary="Filter an active dataset and recalculate analytics",
    description=(
        "Applies multi-column categorical, numeric, and date filters to an active uploaded "
        "dataset and recalculates all statistical analytics, KPIs, trends, distributions, "
        "rankings, and outlier inspections on the filtered subset."
    ),
)
async def filter_dataset(
    payload: DatasetFilterRequest,
) -> DatasetFilterResponse:
    entry = dataset_cache.get(payload.dataset_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset session '{payload.dataset_id}' not found or expired. Please re-upload dataset.",
        )

    df = entry["df"]
    detected_columns = entry["detected_columns"]
    capabilities = entry["capabilities"]
    profile = entry["profile"]
    total_rows = len(df)

    filtered_df, active_summary = DatasetCacheService.filter_dataframe(
        df=df,
        filters=payload.filters,
        detected_columns=detected_columns,
    )
    filtered_rows = len(filtered_df)
    is_filtered = bool(payload.filters and filtered_rows != total_rows)
    pct = round((filtered_rows / total_rows) * 100, 2) if total_rows > 0 else 0.0

    # Recalculate complete analytics on the filtered dataset
    filtered_analytics = StatisticalCalculator.compute(
        df=filtered_df,
        detected_columns=detected_columns,
        capabilities=capabilities,
        profile=profile,
        chosen_metric=payload.primary_metric,
    )
    available_filters = StatisticalCalculator.extract_filter_options(df, detected_columns)

    return DatasetFilterResponse(
        success=True,
        dataset_id=payload.dataset_id,
        total_rows=total_rows,
        filtered_rows=filtered_rows,
        percentage_of_total=pct,
        is_filtered=is_filtered,
        active_filters_summary=active_summary,
        analytics=filtered_analytics,
        available_filters=available_filters,
    )


@router.post(
    "/filter-with-file",
    response_model=DatasetFilterResponse,
    status_code=status.HTTP_200_OK,
    summary="Filter dataset with multipart file fallback",
    description="Accepts dataset file and filters JSON as fallback when session is expired.",
)
async def filter_with_file(
    file: UploadFile = File(..., description="Tabular data file"),
    filters_json: str = Form("{}", description="JSON string of active filter dictionary"),
) -> DatasetFilterResponse:
    file_bytes = await file.read()
    filename = file.filename or "uploaded_dataset"

    df, file_metadata = DatasetProfiler.validate_and_read(
        file_bytes=file_bytes,
        filename=filename,
    )
    profile = DatasetProfiler.profile(df=df, file_metadata=file_metadata)
    analysis = DatasetIntelligenceEngine.analyze(df=df, profile=profile, file_metadata=file_metadata)

    try:
        filters = json.loads(filters_json)
        primary_metric = filters.pop("_primary_metric", None)
    except Exception:
        filters = {}
        primary_metric = None

    filtered_df, active_summary = DatasetCacheService.filter_dataframe(
        df=df,
        filters=filters,
        detected_columns=analysis.detected_columns,
    )
    total_rows = len(df)
    filtered_rows = len(filtered_df)
    is_filtered = bool(filters and filtered_rows != total_rows)
    pct = round((filtered_rows / total_rows) * 100, 2) if total_rows > 0 else 0.0

    filtered_analytics = StatisticalCalculator.compute(
        df=filtered_df,
        detected_columns=analysis.detected_columns,
        capabilities=analysis.capabilities,
        profile=profile,
        chosen_metric=primary_metric,
    )
    available_filters = StatisticalCalculator.extract_filter_options(df, analysis.detected_columns)

    return DatasetFilterResponse(
        success=True,
        dataset_id=analysis.dataset_id or "ds_uploaded",
        total_rows=total_rows,
        filtered_rows=filtered_rows,
        percentage_of_total=pct,
        is_filtered=is_filtered,
        active_filters_summary=active_summary,
        analytics=filtered_analytics,
        available_filters=available_filters,
    )


@router.post(
    "/compare-segments",
    response_model=SegmentComparisonResponse,
    status_code=status.HTTP_200_OK,
    summary="Compare two segments side-by-side",
)
async def compare_segments(payload: SegmentComparisonRequest) -> SegmentComparisonResponse:
    entry = dataset_cache.get(payload.dataset_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset session '{payload.dataset_id}' not found or expired.",
        )

    df = entry["df"]
    detected_columns = entry["detected_columns"]

    try:
        return StatisticalCalculator.compare_segments(
            df=df,
            detected_columns=detected_columns,
            dimension=payload.dimension,
            segment_a=payload.segment_a,
            segment_b=payload.segment_b,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/compare-segments-with-file",
    response_model=SegmentComparisonResponse,
    status_code=status.HTTP_200_OK,
    summary="Compare two segments with uploaded file fallback",
)
async def compare_segments_with_file(
    file: UploadFile = File(...),
    dimension: str = Form(...),
    segment_a: str = Form(...),
    segment_b: str = Form(...),
) -> SegmentComparisonResponse:
    file_bytes = await file.read()
    filename = file.filename or "uploaded_dataset"

    df, file_metadata = DatasetProfiler.validate_and_read(
        file_bytes=file_bytes,
        filename=filename,
    )
    profile = DatasetProfiler.profile(df=df, file_metadata=file_metadata)
    analysis = DatasetIntelligenceEngine.analyze(df=df, profile=profile, file_metadata=file_metadata)

    try:
        return StatisticalCalculator.compare_segments(
            df=df,
            detected_columns=analysis.detected_columns,
            dimension=dimension,
            segment_a=segment_a,
            segment_b=segment_b,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
