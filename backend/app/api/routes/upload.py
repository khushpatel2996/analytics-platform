import json
import re
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from backend.app.analytics.cross_dataset_engine import CrossDatasetEngine
from backend.app.analytics.data_model_builder import DataModelBuilder
from backend.app.analytics.dataset_cache import DatasetCacheService, dataset_cache
from backend.app.analytics.dataset_intelligence import DatasetIntelligenceEngine
from backend.app.analytics.dataset_profiler import DatasetProfiler
from backend.app.analytics.relationship_detector import RelationshipDetector
from backend.app.analytics.statistical_calculator import StatisticalCalculator
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.schemas.cross_dataset import (
    CrossDatasetAnalyticsResponse,
    CrossDatasetQueryRequest,
    CrossDatasetQueryResponse,
    CrossDatasetTrend,
    CrossDatasetTrendRequest,
)
from backend.app.schemas.intelligence import (
    DatasetAnalysisResponse,
    DatasetFilterRequest,
    DatasetFilterResponse,
    SegmentComparisonRequest,
    SegmentComparisonResponse,
)
from backend.app.schemas.upload import (
    DataModelBuildRequest,
    DataModelDataset,
    DataModelRelationship,
    DataModelResponse,
    DataModelSummary,
    DatasetProfileResponse,
    MultiDatasetProfileItem,
    MultiDatasetProfileResponse,
    RelationshipCandidate,
    RelationshipDetectionRequest,
    RelationshipDetectionResponse,
    RelationshipSignals,
    ValidateRelationshipRequest,
)


router = APIRouter(prefix="/upload", tags=["Upload & Profiling"])


@router.post(
    "/profile-multiple",
    response_model=MultiDatasetProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload and profile multiple arbitrary tabular datasets",
    description=(
        "Upload multiple datasets in CSV, Excel (.xlsx, .xls), or JSON format up to 50 MB each. "
        "Returns individual profiles with safe collision-resistant dataset IDs, column types, "
        "statistics, missing values, duplicates, data quality scores, and 10-row previews."
    ),
)
async def upload_and_profile_multiple(
    files: List[UploadFile] = File(..., description="List of tabular data files (CSV, XLSX, XLS, JSON)"),
) -> MultiDatasetProfileResponse:
    if not files or len(files) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files were provided. Please upload at least one dataset file.",
        )

    results: List[MultiDatasetProfileItem] = []
    seen_ids = set()

    for idx, file in enumerate(files):
        filename = file.filename or f"dataset_{idx + 1}"
        file_bytes = await file.read()

        # Validate file size
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(file_bytes) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{filename}' exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB} MB.",
            )

        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{filename}' is empty (0 bytes). Please upload a valid dataset.",
            )

        # Validate and profile
        try:
            df, file_metadata = DatasetProfiler.validate_and_read(
                file_bytes=file_bytes,
                filename=filename,
            )
            profile = DatasetProfiler.profile(df=df, file_metadata=file_metadata)
        except HTTPException as e:
            err_detail = e.detail
            if filename not in str(err_detail):
                err_detail = f"File '{filename}': {err_detail}"
            raise HTTPException(
                status_code=e.status_code,
                detail=err_detail,
            )
        except Exception as e:
            logger.error(f"Error profiling multi-upload file '{filename}': {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{filename}' could not be processed: {str(e)}",
            )

        # Generate unique, collision-resistant, safe dataset_id
        stem = Path(filename).stem
        sanitized_slug = re.sub(r'[^a-zA-Z0-9_]+', '_', stem).strip('_').lower()
        if not sanitized_slug:
            sanitized_slug = f"dataset_{idx + 1}"

        base_id = f"ds_{sanitized_slug}"
        dataset_id = base_id
        counter = 1
        while dataset_id in seen_ids:
            counter += 1
            dataset_id = f"{base_id}_{counter}"
        seen_ids.add(dataset_id)

        # Generate complete generic intelligence analysis for the individual dataset
        analysis = DatasetIntelligenceEngine.analyze(
            df=df,
            profile=profile,
            file_metadata=file_metadata,
            dataset_id=dataset_id,
        )

        results.append(
            MultiDatasetProfileItem(
                dataset_id=dataset_id,
                filename=filename,
                file_type=file_metadata.extension,
                rows=profile.dataset.rows,
                columns=profile.dataset.columns,
                profile=profile,
                analysis=analysis.model_dump(),
            )
        )

    return MultiDatasetProfileResponse(
        success=True,
        dataset_count=len(results),
        datasets=results,
    )


@router.get(
    "/dataset/{dataset_id}/analysis",
    response_model=DatasetAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Get individual intelligence analysis for a specific uploaded dataset",
    description="Retrieves complete generic analytics, modules, and filters for an individual dataset in multi-dataset sessions.",
)
async def get_individual_dataset_analysis(dataset_id: str) -> DatasetAnalysisResponse:
    entry = dataset_cache.get(dataset_id)
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset session '{dataset_id}' not found or expired.",
        )
    cached_analysis = dataset_cache.get_dataset_analysis(dataset_id)
    if cached_analysis:
        return cached_analysis

    profile = entry.get("profile")
    if not profile:
        profile = DatasetProfiler.profile(df=entry["df"], file_metadata=entry["file_metadata"])

    analysis = DatasetIntelligenceEngine.analyze(
        df=entry["df"],
        profile=profile,
        file_metadata=entry["file_metadata"],
        dataset_id=dataset_id,
    )
    return analysis


@router.post(
    "/relationships",
    response_model=RelationshipDetectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Detect candidate relationships across active datasets",
    description=(
        "Analyzes column pairs across active session datasets using name similarity, "
        "data type compatibility, distinct value overlap, uniqueness, and null rate signals. "
        "Returns candidates sorted by confidence descending."
    ),
)
async def detect_relationships_from_cache(
    payload: RelationshipDetectionRequest,
) -> RelationshipDetectionResponse:
    if not payload.dataset_ids or len(payload.dataset_ids) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least two dataset IDs are required to detect relationships.",
        )

    cached_entries = dataset_cache.get_multiple(payload.dataset_ids)
    if len(cached_entries) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Fewer than two active datasets found in session cache. "
                "Datasets may have expired or not yet been uploaded. Please re-upload your files."
            ),
        )

    datasets: List[Dict[str, Any]] = [
        {
            "df": entry["df"],
            "filename": entry["file_metadata"].name,
            "dataset_id": entry["dataset_id"],
            "profile": entry.get("profile"),
        }
        for entry in cached_entries
    ]

    relationships = RelationshipDetector.detect_relationships(datasets)

    return RelationshipDetectionResponse(
        success=True,
        dataset_count=len(datasets),
        relationship_count=len(relationships),
        relationships=relationships,
    )


@router.post(
    "/relationships-with-files",
    response_model=RelationshipDetectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload and detect relationships across multiple files directly",
    description=(
        "Multipart fallback that accepts tabular files directly, profiles them, "
        "registers them in cache, and detects candidate relationships."
    ),
)
async def detect_relationships_with_files(
    files: List[UploadFile] = File(..., description="List of at least two tabular data files"),
) -> RelationshipDetectionResponse:
    if not files or len(files) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least two dataset files are required to detect relationships.",
        )

    datasets: List[Dict[str, Any]] = []
    seen_ids = set()

    for idx, file in enumerate(files):
        filename = file.filename or f"dataset_{idx + 1}"
        file_bytes = await file.read()

        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(file_bytes) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{filename}' exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB} MB.",
            )

        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{filename}' is empty (0 bytes). Please upload a valid dataset.",
            )

        try:
            df, file_metadata = DatasetProfiler.validate_and_read(
                file_bytes=file_bytes,
                filename=filename,
            )
            profile = DatasetProfiler.profile(df=df, file_metadata=file_metadata)
        except HTTPException as e:
            err_detail = e.detail
            if filename not in str(err_detail):
                err_detail = f"File '{filename}': {err_detail}"
            raise HTTPException(status_code=e.status_code, detail=err_detail)
        except Exception as e:
            logger.error(f"Error parsing file '{filename}' for relationships: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File '{filename}' could not be processed: {str(e)}",
            )

        stem = Path(filename).stem
        sanitized_slug = re.sub(r'[^a-zA-Z0-9_]+', '_', stem).strip('_').lower()
        if not sanitized_slug:
            sanitized_slug = f"dataset_{idx + 1}"

        base_id = f"ds_{sanitized_slug}"
        dataset_id = base_id
        counter = 1
        while dataset_id in seen_ids:
            counter += 1
            dataset_id = f"{base_id}_{counter}"
        seen_ids.add(dataset_id)

        dataset_cache.register_dataset(
            df=df,
            profile=profile,
            file_metadata=file_metadata,
            dataset_id=dataset_id,
        )

        datasets.append({
            "df": df,
            "filename": filename,
            "dataset_id": dataset_id,
            "profile": profile,
        })

    relationships = RelationshipDetector.detect_relationships(datasets)

    return RelationshipDetectionResponse(
        success=True,
        dataset_count=len(datasets),
        relationship_count=len(relationships),
        relationships=relationships,
    )


@router.post(
    "/data-model",
    response_model=DataModelResponse,
    status_code=status.HTTP_200_OK,
    summary="Construct and validate Data Model from accepted relationships",
    description=(
        "Takes user-accepted relationships, validates dataset presence, column schemas, "
        "type compatibility, null percentages, key uniqueness, and declared cardinality. "
        "Builds connected components and identifies orphan datasets without merging tables."
    ),
)
async def build_data_model_endpoint(
    payload: DataModelBuildRequest,
) -> DataModelResponse:
    if payload.dataset_ids:
        cached_entries = dataset_cache.get_multiple(payload.dataset_ids)
    else:
        cached_entries = dataset_cache.get_all_datasets()

    if not cached_entries:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active datasets found in session cache. Please upload your datasets first.",
        )

    datasets: List[Dict[str, Any]] = [
        {
            "df": entry["df"],
            "filename": getattr(entry.get("file_metadata"), "name", None) or entry.get("filename") or entry.get("dataset_id"),
            "dataset_id": entry["dataset_id"],
            "profile": entry.get("profile"),
        }
        for entry in cached_entries
    ]

    model = DataModelBuilder.build_data_model(
        datasets=datasets,
        accepted_relationships=payload.accepted_relationships,
    )
    dataset_cache.set_data_model(model)
    return model


@router.post(
    "/data-model-with-files",
    response_model=DataModelResponse,
    status_code=status.HTTP_200_OK,
    summary="Construct and validate Data Model directly with uploaded files",
)
async def build_data_model_with_files(
    files: List[UploadFile] = File(..., description="Tabular dataset files"),
    accepted_relationships_json: str = Form("[]", description="JSON string of accepted relationships"),
) -> DataModelResponse:
    if not files or len(files) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one dataset file is required.",
        )

    try:
        raw_rels = json.loads(accepted_relationships_json)
        accepted_relationships = [RelationshipCandidate(**r) for r in raw_rels]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid accepted_relationships_json: {str(e)}",
        )

    datasets: List[Dict[str, Any]] = []
    seen_ids = set()

    for idx, file in enumerate(files):
        filename = file.filename or f"dataset_{idx + 1}"
        file_bytes = await file.read()
        df, file_metadata = DatasetProfiler.validate_and_read(
            file_bytes=file_bytes,
            filename=filename,
        )
        profile = DatasetProfiler.profile(df=df, file_metadata=file_metadata)

        stem = Path(filename).stem
        sanitized_slug = re.sub(r'[^a-zA-Z0-9_]+', '_', stem).strip('_').lower()
        if not sanitized_slug:
            sanitized_slug = f"dataset_{idx + 1}"
        base_id = f"ds_{sanitized_slug}"
        dataset_id = base_id
        counter = 1
        while dataset_id in seen_ids:
            counter += 1
            dataset_id = f"{base_id}_{counter}"
        seen_ids.add(dataset_id)

        dataset_cache.register_dataset(
            df=df,
            profile=profile,
            file_metadata=file_metadata,
            dataset_id=dataset_id,
        )

        datasets.append({
            "df": df,
            "filename": filename,
            "dataset_id": dataset_id,
            "profile": profile,
        })

    model = DataModelBuilder.build_data_model(
        datasets=datasets,
        accepted_relationships=accepted_relationships,
    )
    dataset_cache.set_data_model(model)
    return model


@router.get(
    "/data-model",
    response_model=DataModelResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve current active Data Model",
)
async def get_current_data_model() -> DataModelResponse:
    model = dataset_cache.get_data_model()
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active Data Model found in session. Please build one first.",
        )
    return model


@router.post(
    "/data-model/validate-relationship",
    status_code=status.HTTP_200_OK,
    summary="Validate a proposed relationship candidate before adding",
)
async def validate_manual_relationship(
    payload: ValidateRelationshipRequest,
) -> Dict[str, Any]:
    current_model = dataset_cache.get_data_model()
    if current_model and current_model.datasets:
        model_dataset_ids = [d.dataset_id for d in current_model.datasets]
        cached_entries = dataset_cache.get_multiple(model_dataset_ids)
    else:
        cached_entries = dataset_cache.get_all_datasets()

    if not cached_entries:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active datasets found in session cache.",
        )

    datasets: List[Dict[str, Any]] = [
        {
            "df": entry["df"],
            "filename": getattr(entry.get("file_metadata"), "name", None) or entry.get("filename") or entry.get("dataset_id"),
            "dataset_id": entry["dataset_id"],
        }
        for entry in cached_entries
    ]

    lookup = DataModelBuilder._create_dataset_lookup(datasets)
    dummy_candidate = RelationshipCandidate(
        relationship_id=f"rel_manual_{uuid.uuid4().hex[:8]}",
        left_dataset=payload.left_dataset,
        left_column=payload.left_column,
        right_dataset=payload.right_dataset,
        right_column=payload.right_column,
        relationship_type=payload.relationship_type,
        confidence=100,
        match_level="Manual Link",
        signals=RelationshipSignals(
            name_similarity=1.0,
            type_compatible=True,
            value_overlap=1.0,
            left_unique=True,
            right_unique=False,
            left_null_rate=0.0,
            right_null_rate=0.0,
        ),
        explanation=["Manual user relationship"],
        status="accepted",
    )

    is_valid, validation_status, notes = DataModelBuilder.validate_relationship(dummy_candidate, lookup)
    return {
        "valid": is_valid,
        "status": validation_status,
        "notes": notes,
        "candidate": dummy_candidate.model_dump() if is_valid else None,
    }


@router.delete(
    "/data-model/relationships/{relationship_id}",
    response_model=DataModelResponse,
    status_code=status.HTTP_200_OK,
    summary="Remove a relationship from the active Data Model",
)
async def delete_model_relationship(
    relationship_id: str,
) -> DataModelResponse:
    current_model = dataset_cache.get_data_model()
    if not current_model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active Data Model found in session cache.",
        )

    model_dataset_ids = [d.dataset_id for d in current_model.datasets]
    cached_entries = dataset_cache.get_multiple(model_dataset_ids)
    if not cached_entries:
        cached_entries = dataset_cache.get_all_datasets()

    datasets: List[Dict[str, Any]] = [
        {
            "df": entry["df"],
            "filename": getattr(entry.get("file_metadata"), "name", None) or entry.get("filename") or entry.get("dataset_id"),
            "dataset_id": entry["dataset_id"],
        }
        for entry in cached_entries
    ]

    # Filter out removed relationship
    remaining_candidates = [
        RelationshipCandidate(
            relationship_id=r.relationship_id,
            left_dataset=r.left_dataset,
            left_dataset_id=r.left_dataset_id,
            left_column=r.left_column,
            right_dataset=r.right_dataset,
            right_dataset_id=r.right_dataset_id,
            right_column=r.right_column,
            relationship_type=r.relationship_type,
            confidence=r.confidence,
            match_level="Accepted",
            signals=RelationshipSignals(
                name_similarity=1.0,
                type_compatible=True,
                value_overlap=1.0,
                left_unique=True,
                right_unique=False,
                left_null_rate=0.0,
                right_null_rate=0.0,
            ),
            explanation=r.validation_notes,
            status="accepted",
        )
        for r in current_model.relationships
        if r.relationship_id != relationship_id
    ]

    updated_model = DataModelBuilder.build_data_model(
        datasets=datasets,
        accepted_relationships=remaining_candidates,
        model_id=current_model.model_id,
    )
    dataset_cache.set_data_model(updated_model)
    return updated_model


class CrossDatasetAnalyticsRequest(BaseModel):
    model_id: Optional[str] = None
    group_id: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None
    dataset_ids: Optional[List[str]] = None


@router.post(
    "/cross-dataset-analytics",
    response_model=CrossDatasetAnalyticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate cross-dataset analytics from validated Data Model",
    description="Executes safe joins across accepted relationships and returns cross-table analytics, KPIs, trends, and rankings.",
)
async def generate_cross_dataset_analytics(
    payload: Optional[CrossDatasetAnalyticsRequest] = None,
) -> CrossDatasetAnalyticsResponse:
    current_model = dataset_cache.get_data_model()
    if not current_model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active Data Model found. Please build and validate a Data Model first.",
        )

    model_dataset_ids = [d.dataset_id for d in current_model.datasets]
    cached_entries = dataset_cache.get_multiple(model_dataset_ids)
    if not cached_entries:
        cached_entries = dataset_cache.get_all_datasets()

    if not cached_entries:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Datasets for the active Data Model could not be found in session cache.",
        )

    datasets: List[Dict[str, Any]] = [
        {
            "df": entry["df"],
            "filename": getattr(entry.get("file_metadata"), "name", None) or entry.get("filename") or entry.get("dataset_id"),
            "dataset_id": entry["dataset_id"],
        }
        for entry in cached_entries
    ]

    filters = payload.filters if payload else None
    analytics_res = CrossDatasetEngine.generate_analytics_for_model(
        model=current_model,
        datasets=datasets,
        filters=filters,
    )
    dataset_cache.set_cross_dataset_analytics(analytics_res)
    return analytics_res


@router.get(
    "/cross-dataset-analytics",
    response_model=CrossDatasetAnalyticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get active cross-dataset analytics from session cache",
)
async def get_cross_dataset_analytics() -> CrossDatasetAnalyticsResponse:
    cached = dataset_cache.get_cross_dataset_analytics()
    if cached:
        return cached

    current_model = dataset_cache.get_data_model()
    if not current_model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active Data Model found. Please build a Data Model first.",
        )

    model_dataset_ids = [d.dataset_id for d in current_model.datasets]
    cached_entries = dataset_cache.get_multiple(model_dataset_ids)
    if not cached_entries:
        cached_entries = dataset_cache.get_all_datasets()

    datasets: List[Dict[str, Any]] = [
        {
            "df": entry["df"],
            "filename": getattr(entry.get("file_metadata"), "name", None) or entry.get("filename") or entry.get("dataset_id"),
            "dataset_id": entry["dataset_id"],
        }
        for entry in cached_entries
    ]

    analytics_res = CrossDatasetEngine.generate_analytics_for_model(
        model=current_model,
        datasets=datasets,
    )
    dataset_cache.set_cross_dataset_analytics(analytics_res)
    return analytics_res


@router.post(
    "/cross-dataset-query",
    response_model=CrossDatasetQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute dynamic cross-dataset ranking query",
)
async def execute_cross_dataset_query(
    payload: CrossDatasetQueryRequest,
) -> CrossDatasetQueryResponse:
    current_model = dataset_cache.get_data_model()
    if not current_model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active Data Model found for cross-dataset query.",
        )

    model_dataset_ids = [d.dataset_id for d in current_model.datasets]
    cached_entries = dataset_cache.get_multiple(model_dataset_ids)
    if not cached_entries:
        cached_entries = dataset_cache.get_all_datasets()

    datasets: List[Dict[str, Any]] = [
        {
            "df": entry["df"],
            "filename": getattr(entry.get("file_metadata"), "name", None) or entry.get("filename") or entry.get("dataset_id"),
            "dataset_id": entry["dataset_id"],
        }
        for entry in cached_entries
    ]

    lookup = CrossDatasetEngine.create_dataset_lookup(datasets)
    try:
        return CrossDatasetEngine.execute_dynamic_query(
            req=payload,
            model=current_model,
            dataset_lookup=lookup,
        )
    except Exception as e:
        logger.error(f"Error executing cross-dataset query: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/cross-dataset-trend",
    response_model=CrossDatasetTrend,
    status_code=status.HTTP_200_OK,
    summary="Execute dynamic cross-dataset trend query",
)
async def execute_cross_dataset_trend_route(
    payload: CrossDatasetTrendRequest,
) -> CrossDatasetTrend:
    current_model = dataset_cache.get_data_model()
    if not current_model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active Data Model found for cross-dataset trend.",
        )

    model_dataset_ids = [d.dataset_id for d in current_model.datasets]
    cached_entries = dataset_cache.get_multiple(model_dataset_ids)
    if not cached_entries:
        cached_entries = dataset_cache.get_all_datasets()

    datasets: List[Dict[str, Any]] = [
        {
            "df": entry["df"],
            "filename": getattr(entry.get("file_metadata"), "name", None) or entry.get("filename") or entry.get("dataset_id"),
            "dataset_id": entry["dataset_id"],
        }
        for entry in cached_entries
    ]

    lookup = CrossDatasetEngine.create_dataset_lookup(datasets)
    try:
        return CrossDatasetEngine.execute_dynamic_trend(
            req=payload,
            model=current_model,
            dataset_lookup=lookup,
        )
    except Exception as e:
        logger.error(f"Error executing cross-dataset trend: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

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
