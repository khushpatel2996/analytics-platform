import sys
from pathlib import Path
import argparse
import uvicorn

# Ensure backend root and workspace root are in sys.path
CURRENT_DIR = Path(__file__).resolve().parent
WORKSPACE_DIR = CURRENT_DIR.parent

for p in [str(CURRENT_DIR), str(WORKSPACE_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app.core.config import settings
from backend.app.core.logging import logger


def run_pipeline():
    """
    Executes the legacy India Sales data pipeline:
    1. Ingestion of raw CSV tables
    2. Data cleaning, normalization, and deduplication
    3. Analytical fact table construction
    4. Customer RFM calculation and K-Means segmentation
    5. Persistence to Parquet and ML models
    """

    # Legacy pipeline dependencies are imported only when
    # the pipeline command is explicitly requested.
    from backend.app.data.loader import DataLoader
    from backend.app.data.cleaner import DataCleaner
    from backend.app.data.merger import DataMerger
    from backend.app.ml.model_manager import ModelManager

    print("\n" + "=" * 60)
    print("STARTING INDIA SALES ANALYTICS DATA PIPELINE")
    print("=" * 60)

    # 1. Ingestion
    logger.info("PHASE 1: Ingesting raw CSV files...")
    loader = DataLoader()
    raw_tables = loader.load_all()
    print(f"Loaded {len(raw_tables)} raw tables successfully.")

    # 2. Cleaning
    logger.info("PHASE 2: Cleaning and normalizing dataset...")
    cleaner = DataCleaner(raw_tables)
    cleaned_tables = cleaner.clean_all()
    clean_report = cleaner.get_cleaning_report()

    print(
        f"Cleaned "
        f"{clean_report['total_original_rows']:,} rows -> "
        f"{clean_report['total_cleaned_rows']:,} valid rows."
    )

    # 3. Merging & Fact Table Generation
    logger.info("PHASE 3: Building analytical fact tables...")
    merger = DataMerger(cleaned_tables)
    fact_orders, fact_items = merger.build_fact_tables()
    merger.save_processed()

    print(
        f"Generated fact_orders ({len(fact_orders):,} rows) "
        f"and fact_order_items ({len(fact_items):,} rows)."
    )

    # 4. Customer RFM & K-Means Segmentation
    logger.info(
        "PHASE 4: Executing RFM analysis and training KMeans model..."
    )

    model_manager = ModelManager()
    clustered_df, summary = model_manager.train_and_save(
        fact_orders,
        n_clusters=4
    )

    print(
        f"Segmented {len(clustered_df):,} customers into "
        f"{summary.get('n_clusters', 4)} clusters."
    )

    print(
        f"Silhouette Score: "
        f"{summary.get('silhouette_score', 0.0)}"
    )

    print("\n" + "=" * 60)
    print("PIPELINE COMPLETED SUCCESSFULLY!")
    print(
        f"Processed analytical files stored in: "
        f"{settings.DATA_PROCESSED_DIR}"
    )
    print(
        f"Machine learning models saved in: "
        f"{settings.MODELS_DIR}"
    )
    print("=" * 60 + "\n")


def run_api(
    host: str = "127.0.0.1",
    port: int = 8000,
    reload: bool = True
):
    """
    Starts the FastAPI REST API server via Uvicorn.
    """

    logger.info(
        f"Starting API server on http://{host}:{port}..."
    )

    print(
        f"\nAPI Documentation available at: "
        f"http://{host}:{port}/docs"
    )

    print(
        f"Alternative ReDoc at: "
        f"http://{host}:{port}/redoc"
    )

    print(
        f"Health check at: "
        f"http://{host}:{port}/api/health\n"
    )

    uvicorn.run(
        "backend.app.main:app",
        host=host,
        port=port,
        reload=reload
    )


def main():
    parser = argparse.ArgumentParser(
        description="Analytics Platform Backend CLI"
    )

    subparsers = parser.add_subparsers(
        dest="command",
        help="Command to run"
    )

    # Legacy pipeline command
    pipe_parser = subparsers.add_parser(
        "pipeline",
        aliases=["ingest", "process"],
        help="Run legacy data ingestion, cleaning, and ML pipeline"
    )

    # API command
    api_parser = subparsers.add_parser(
        "api",
        aliases=["start", "serve"],
        help="Run FastAPI server"
    )

    api_parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Host interface (default: 127.0.0.1)"
    )

    api_parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port (default: 8000)"
    )

    api_parser.add_argument(
        "--no-reload",
        action="store_true",
        help="Disable auto-reload"
    )

    # Full legacy pipeline + API command
    all_parser = subparsers.add_parser(
        "all",
        help="Run legacy pipeline then launch API server"
    )

    all_parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Host interface (default: 127.0.0.1)"
    )

    all_parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port (default: 8000)"
    )

    args = parser.parse_args()

    if args.command in ["pipeline", "ingest", "process"]:
        run_pipeline()

    elif args.command in ["api", "start", "serve"]:
        run_api(
            host=args.host,
            port=args.port,
            reload=not args.no_reload
        )

    elif args.command == "all":
        run_pipeline()

        run_api(
            host=args.host,
            port=args.port,
            reload=True
        )

    else:
        # Default behavior:
        # Start API without automatically importing or running
        # the legacy ML pipeline.
        run_api()


if __name__ == "__main__":
    main()