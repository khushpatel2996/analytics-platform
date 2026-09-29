from typing import Dict, Any, Tuple, List
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
from backend.app.core.logging import logger

class KMeansClusterer:
    """
    Performs K-Means clustering on customer RFM metrics with log-transformation,
    standard scaling, silhouette scoring, and business segment profiling.
    """
    def __init__(self, n_clusters: int = 4, random_state: int = 42):
        self.n_clusters = n_clusters
        self.random_state = random_state
        self.scaler = StandardScaler()
        self.kmeans = KMeans(n_clusters=self.n_clusters, random_state=self.random_state, n_init=10)
        self.is_fitted = False
        self.silhouette_avg = 0.0

    def fit_predict(self, rfm_df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Fits K-Means on log-transformed and scaled RFM features.
        Returns enriched dataframe with cluster labels and cluster profiling summary.
        """
        logger.info(f"Fitting KMeans with k={self.n_clusters} on RFM metrics...")
        if rfm_df.empty or len(rfm_df) < self.n_clusters:
            return rfm_df, {"error": "Not enough data for clustering"}

        df = rfm_df.copy()

        # Handle zero or negative monetary values prior to log transform
        features = df[["recency", "frequency", "monetary"]].copy()
        features["monetary"] = features["monetary"].clip(lower=0.0)

        # Log transform to normalize right-skewed distributions
        features_log = np.log1p(features)

        # Standardize features
        scaled_features = self.scaler.fit_transform(features_log)

        # Fit KMeans
        clusters = self.kmeans.fit_predict(scaled_features)
        df["cluster_id"] = clusters
        self.is_fitted = True

        # Compute silhouette score on a sample for performance
        sample_size = min(5000, len(scaled_features))
        try:
            self.silhouette_avg = float(
                silhouette_score(
                    scaled_features[:sample_size],
                    clusters[:sample_size]
                )
            )
            logger.info(f"K-Means silhouette score (sample={sample_size}): {self.silhouette_avg:.4f}")
        except Exception as e:
            logger.warning(f"Could not compute silhouette score: {e}")
            self.silhouette_avg = 0.0

        # Profile clusters and assign descriptive business names
        cluster_summary = self.profile_clusters(df)

        # Map descriptive cluster names back to dataframe
        name_map = {c["cluster_id"]: c["segment_name"] for c in cluster_summary["clusters"]}
        df["kmeans_segment"] = df["cluster_id"].map(name_map)

        return df, cluster_summary

    def profile_clusters(self, df_with_clusters: pd.DataFrame) -> Dict[str, Any]:
        """
        Profiles each cluster by computing average RFM metrics and assigning business labels.
        """
        total_customers = len(df_with_clusters)
        clusters_list = []

        agg = df_with_clusters.groupby("cluster_id").agg(
            size=("customer_unique_id", "count"),
            avg_recency=("recency", "mean"),
            avg_frequency=("frequency", "mean"),
            avg_monetary=("monetary", "mean"),
            total_monetary=("monetary", "sum")
        ).reset_index()

        # Rank clusters by monetary spend to label them meaningfully
        agg = agg.sort_values(by="avg_monetary", ascending=False).reset_index(drop=True)

        for idx, row in agg.iterrows():
            cid = int(row["cluster_id"])
            size = int(row["size"])
            pct = round((size / total_customers) * 100, 2)
            avg_m = round(float(row["avg_monetary"]), 2)
            avg_f = round(float(row["avg_frequency"]), 2)
            avg_r = round(float(row["avg_recency"]), 1)
            tot_m = round(float(row["total_monetary"]), 2)

            # Assign meaningful segment titles based on relative position
            if idx == 0:
                name = "High-Value Champions"
            elif idx == 1:
                name = "Mid-Tier Regulars"
            elif avg_r < 150:
                name = "Recent Active Buyers"
            else:
                name = "Dormant / Low-Value"

            clusters_list.append({
                "cluster_id": cid,
                "segment_name": name,
                "segment_size": size,
                "percentage_of_customers": pct,
                "average_revenue": avg_m,
                "average_frequency": avg_f,
                "average_recency": avg_r,
                "total_revenue": tot_m
            })

        # Return sorted by cluster_id
        clusters_list.sort(key=lambda x: x["cluster_id"])
        return {
            "n_clusters": self.n_clusters,
            "silhouette_score": round(self.silhouette_avg, 4),
            "total_customers": total_customers,
            "clusters": clusters_list
        }
