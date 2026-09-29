import sys
import os
from pathlib import Path

# Ensure backend root and workspace root are in sys.path
CURRENT_DIR = Path(__file__).resolve().parent
WORKSPACE_DIR = CURRENT_DIR.parent
for p in [str(CURRENT_DIR), str(WORKSPACE_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

import argparse
import uvicorn
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.data.loader import DataLoader
from backend.app.data.cleaner import DataCleaner
from backend.app.data.merger import DataMerger
from backend.app.ml.model_manager import ModelManager

def run_pipeline():
    """
    Executes the end-to-end data pipeline:
    1. Ingestion of raw CSV tables
    2. Data cleaning, normalization, and deduplication
    3. Analytical fact table construction (orders + items)
    4. Customer RFM calculation and K-Means segmentation
    5. Persistence to Parquet and SQLite
    """
    print("\n" + "="*60)
    print("STARTING INDIA SALES ANALYTICS DATA PIPELINE")
    print("="*60)

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
    print(f"Cleaned {clean_report['total_original_rows']:,} rows -> {clean_report['total_cleaned_rows']:,} valid rows.")

    # 3. Merging & Fact Table Generation
    logger.info("PHASE 3: Building analytical fact tables...")
    merger = DataMerger(cleaned_tables)
    fact_orders, fact_items = merger.build_fact_tables()
    merger.save_processed()
    print(f"Generated fact_orders ({len(fact_orders):,} rows) and fact_order_items ({len(fact_items):,} rows).")

    # 4. Customer RFM & K-Means Segmentation
    logger.info("PHASE 4: Executing RFM analysis and training KMeans model...")
    model_manager = ModelManager()
    clustered_df, summary = model_manager.train_and_save(fact_orders, n_clusters=4)
    print(f"Segmented {len(clustered_df):,} customers into {summary.get('n_clusters', 4)} clusters.")
    print(f"Silhouette Score: {summary.get('silhouette_score', 0.0)}")

    print("\n" + "="*60)
    print("PIPELINE COMPLETED SUCCESSFULLY!")
    print(f"Processed analytical files stored in: {settings.DATA_PROCESSED_DIR}")
    print(f"Machine learning models saved in: {settings.MODELS_DIR}")
    print("="*60 + "\n")

def run_api(host: str = "127.0.0.1", port: int = 8000, reload: bool = True):
    """
    Starts the FastAPI REST API server via Uvicorn.
    """
    logger.info(f"Starting API server on http://{host}:{port}...")
    print(f"\nAPI Documentation available at: http://{host}:{port}/docs")
    print(f"Alternative ReDoc at: http://{host}:{port}/redoc")
    print(f"Health check at: http://{host}:{port}/api/health\n")
    uvicorn.run("backend.app.main:app", host=host, port=port, reload=reload)

def main():
    parser = argparse.ArgumentParser(description="India Sales Analytics Backend CLI")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Pipeline command
    pipe_parser = subparsers.add_parser("pipeline", aliases=["ingest", "process"], help="Run data ingestion, cleaning, and ML pipeline")

    # API command
    api_parser = subparsers.add_parser("api", aliases=["start", "serve"], help="Run FastAPI server")
    api_parser.add_argument("--host", default="127.0.0.1", help="Host interface (default: 127.0.0.1)")
    api_parser.add_argument("--port", type=int, default=8000, help="Port (default: 8000)")
    api_parser.add_argument("--no-reload", action="store_true", help="Disable auto-reload")

    # All command
    all_parser = subparsers.add_parser("all", help="Run full pipeline then launch API server")
    all_parser.add_argument("--host", default="127.0.0.1", help="Host interface (default: 127.0.0.1)")
    all_parser.add_argument("--port", type=int, default=8000, help="Port (default: 8000)")

    args = parser.parse_args()

    if args.command in ["pipeline", "ingest", "process"]:
        run_pipeline()
    elif args.command in ["api", "start", "serve"]:
        run_api(host=args.host, port=args.port, reload=not args.no_reload)
    elif args.command == "all":
        run_pipeline()
        run_api(host=args.host, port=args.port, reload=True)
    else:
        # Default behavior if no args provided: check if processed files exist, run pipeline if not, then start API
        processed_file = settings.DATA_PROCESSED_DIR / "fact_orders.parquet"
        if not processed_file.exists():
            print("No processed analytical dataset found. Running data pipeline first...")
            run_pipeline()
        run_api()

if __name__ == "__main__":
    main()
