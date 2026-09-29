import os
from pathlib import Path
from typing import Optional, Dict, Any, Tuple
import joblib
import pandas as pd
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.ml.rfm import RFMAnalyzer
from backend.app.ml.clustering import KMeansClusterer

class ModelManager:
    """
    Orchestrates RFM calculation and K-Means clustering, persisting trained
    models and scalers to disk using Joblib.
    """
    def __init__(self, models_dir: Optional[Path] = None):
        self.models_dir = Path(models_dir) if models_dir else settings.MODELS_DIR
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.kmeans_path = self.models_dir / "kmeans_rfm.joblib"
        self.scaler_path = self.models_dir / "scaler_rfm.joblib"
        self.summary_path = self.models_dir / "segmentation_summary.joblib"

    def train_and_save(self, orders_df: pd.DataFrame, n_clusters: int = 4) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Executes RFM scoring, trains KMeans clustering, and saves artifacts to disk.
        """
        logger.info("Initiating full customer segmentation pipeline...")
        rfm_analyzer = RFMAnalyzer()
        rfm_df = rfm_analyzer.run(orders_df)

        clusterer = KMeansClusterer(n_clusters=n_clusters)
        clustered_df, summary = clusterer.fit_predict(rfm_df)

        # Save artifacts
        try:
            joblib.dump(clusterer.kmeans, self.kmeans_path)
            joblib.dump(clusterer.scaler, self.scaler_path)
            joblib.dump(summary, self.summary_path)
            logger.info(f"Model artifacts successfully saved to {self.models_dir}")
        except Exception as e:
            logger.error(f"Failed to persist model artifacts: {e}")

        # Also persist clustered RFM dataframe as parquet for lightning-fast queries
        processed_dir = settings.DATA_PROCESSED_DIR
        processed_dir.mkdir(parents=True, exist_ok=True)
        clustered_df.to_parquet(processed_dir / "dim_customers_rfm.parquet", index=False)

        # Root copy if different
        alt_dir = settings.WORKSPACE_DIR / "data" / "processed"
        if alt_dir != processed_dir and alt_dir.exists():
            clustered_df.to_parquet(alt_dir / "dim_customers_rfm.parquet", index=False)

        return clustered_df, summary

    def load_summary(self) -> Optional[Dict[str, Any]]:
        """Loads cached customer segmentation summary if available."""
        if self.summary_path.exists():
            try:
                return joblib.load(self.summary_path)
            except Exception as e:
                logger.warning(f"Error loading segmentation summary: {e}")
        return None
