from typing import Dict, Any, Tuple
import pandas as pd
import numpy as np
from backend.app.core.logging import logger

class RFMAnalyzer:
    """
    Computes Recency, Frequency, and Monetary metrics for unique customers,
    calculates score percentiles (1-5), and segments customers using
    a deterministic, documented e-commerce scoring rubric.
    """
    def __init__(self, reference_date: pd.Timestamp = None):
        self.reference_date = reference_date

    def calculate_rfm(self, orders_df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculates raw R, F, and M metrics per customer_unique_id.
        """
        logger.info("Computing customer RFM metrics...")
        valid_orders = orders_df[orders_df["order_status"] != "canceled"].copy()
        valid_orders["order_purchase_timestamp"] = pd.to_datetime(valid_orders["order_purchase_timestamp"], errors="coerce")
        valid_orders = valid_orders.dropna(subset=["customer_unique_id", "order_purchase_timestamp"])

        if valid_orders.empty:
            return pd.DataFrame(columns=["customer_unique_id", "recency", "frequency", "monetary"])

        ref_date = self.reference_date or (valid_orders["order_purchase_timestamp"].max() + pd.Timedelta(days=1))

        rfm = valid_orders.groupby("customer_unique_id").agg(
            last_order=("order_purchase_timestamp", "max"),
            first_order=("order_purchase_timestamp", "min"),
            frequency=("order_id", "nunique"),
            monetary=("order_total_value", "sum"),
            state=("customer_state", "first"),
            city=("customer_city", "first"),
            region=("customer_region", "first")
        ).reset_index()

        rfm["recency"] = (ref_date - rfm["last_order"]).dt.days
        rfm["monetary"] = rfm["monetary"].round(2)
        return rfm

    def score_rfm(self, rfm_df: pd.DataFrame) -> pd.DataFrame:
        """
        Assigns 1-5 scores for Recency, Frequency, Monetary.
        R_score: 5 is best (most recent, least days)
        F_score: 5 is best (highest order count)
        M_score: 5 is best (highest spend)
        """
        if rfm_df.empty:
            return rfm_df

        df = rfm_df.copy()

        # Recency score (inverted: lower days = higher score)
        df["r_score"] = pd.qcut(df["recency"].rank(method="first"), q=5, labels=[5, 4, 3, 2, 1]).astype(int)

        # Frequency score (e-commerce distribution has heavy 1-order spike)
        def assign_f_score(freq: int) -> int:
            if freq >= 4:
                return 5
            elif freq == 3:
                return 4
            elif freq == 2:
                return 3
            return 1 # 1 order

        df["f_score"] = df["frequency"].apply(assign_f_score)

        # Monetary score (higher spend = higher score)
        df["m_score"] = pd.qcut(df["monetary"].rank(method="first"), q=5, labels=[1, 2, 3, 4, 5]).astype(int)

        # Composite RFM Score string
        df["rfm_score"] = df["r_score"].astype(str) + df["f_score"].astype(str) + df["m_score"].astype(str)

        # Rule-based Segment Mapping
        df["rfm_segment"] = df.apply(self._assign_segment, axis=1)
        return df

    @staticmethod
    def _assign_segment(row: pd.Series) -> str:
        r = row["r_score"]
        f = row["f_score"]
        m = row["m_score"]

        if r >= 4 and f >= 3 and m >= 4:
            return "Champions"
        elif f >= 3 and m >= 3:
            return "Loyal Customers"
        elif r >= 4 and f == 1 and m >= 3:
            return "Potential Loyalists"
        elif r >= 4 and f == 1 and m < 3:
            return "New Customers"
        elif r <= 2 and f >= 3:
            return "At Risk"
        elif r <= 2 and f < 3 and m >= 3:
            return "Needs Attention"
        elif r == 3:
            return "Promising"
        else:
            return "Hibernating"

    def run(self, orders_df: pd.DataFrame) -> pd.DataFrame:
        """Runs the complete RFM pipeline and returns scored dataframe."""
        raw_rfm = self.calculate_rfm(orders_df)
        scored_rfm = self.score_rfm(raw_rfm)
        logger.info(f"RFM analysis completed for {len(scored_rfm):,} unique customers.")
        return scored_rfm
