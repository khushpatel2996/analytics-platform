from typing import Dict, Any, Tuple
import pandas as pd
import numpy as np
from backend.app.core.logging import logger
from backend.app.utils.date_utils import add_date_features

class DataTransformer:
    """
    Computes aggregations and engineered features across orders,
    items, payments, reviews, and customers to prepare clean analytical tables.
    """
    def __init__(self):
        pass

    def aggregate_payments(self, payments_df: pd.DataFrame) -> pd.DataFrame:
        """
        Aggregates payment records per order to prevent Cartesian products during joins.
        """
        logger.info("Aggregating payment records per order...")
        if payments_df.empty:
            return pd.DataFrame(columns=["order_id", "total_payment_value", "primary_payment_type", "payment_installments_max", "payments_count"])

        # Determine highest-value payment method as primary payment type for each order
        sorted_payments = payments_df.sort_values(by=["order_id", "payment_value"], ascending=[True, False])
        primary_payment = sorted_payments.drop_duplicates(subset=["order_id"], keep="first")[["order_id", "payment_type", "payment_installments"]]
        primary_payment.columns = ["order_id", "primary_payment_type", "payment_installments_max"]

        agg_vals = payments_df.groupby("order_id").agg(
            total_payment_value=("payment_value", "sum"),
            payments_count=("payment_sequential", "count")
        ).reset_index()

        result = pd.merge(agg_vals, primary_payment, on="order_id", how="left")
        return result

    def aggregate_reviews(self, reviews_df: pd.DataFrame) -> pd.DataFrame:
        """
        Aggregates review ratings per order.
        """
        logger.info("Aggregating reviews per order...")
        if reviews_df.empty:
            return pd.DataFrame(columns=["order_id", "order_review_score"])

        agg_reviews = reviews_df.groupby("order_id").agg(
            order_review_score=("review_score", "mean")
        ).reset_index()
        return agg_reviews

    def enrich_order_items(self, order_items_df: pd.DataFrame, products_df: pd.DataFrame, sellers_df: pd.DataFrame) -> pd.DataFrame:
        """
        Enriches order items with product category and seller location details.
        """
        logger.info("Enriching order items with product and seller metadata...")
        df = order_items_df.copy()

        # Join products
        if not products_df.empty:
            p_cols = ["product_id", "product_category_name", "product_weight_g"]
            cols_to_use = [c for c in p_cols if c in products_df.columns]
            df = pd.merge(df, products_df[cols_to_use], on="product_id", how="left")
            df["product_category_name"] = df["product_category_name"].fillna("Others")

        # Join sellers
        if not sellers_df.empty:
            s_cols = ["seller_id", "seller_city", "seller_state", "seller_region"]
            cols_to_use = [c for c in s_cols if c in sellers_df.columns]
            df = pd.merge(df, sellers_df[cols_to_use], on="seller_id", how="left")

        return df

    def aggregate_items_by_order(self, enriched_items_df: pd.DataFrame) -> pd.DataFrame:
        """
        Aggregates item metrics to order level for order-grain fact table.
        """
        logger.info("Aggregating order items up to order level...")
        if enriched_items_df.empty:
            return pd.DataFrame(columns=["order_id", "total_items", "order_revenue", "order_freight", "order_total_value", "category"])

        # Determine primary category per order
        top_cats = (
            enriched_items_df.groupby(["order_id", "product_category_name"])["price"]
            .sum()
            .reset_index()
            .sort_values(by=["order_id", "price"], ascending=[True, False])
            .drop_duplicates(subset=["order_id"], keep="first")[["order_id", "product_category_name"]]
            .rename(columns={"product_category_name": "category"})
        )

        # Primary seller per order
        top_sellers = (
            enriched_items_df.groupby(["order_id", "seller_id"])["price"]
            .sum()
            .reset_index()
            .sort_values(by=["order_id", "price"], ascending=[True, False])
            .drop_duplicates(subset=["order_id"], keep="first")[["order_id", "seller_id"]]
        )

        agg = enriched_items_df.groupby("order_id").agg(
            total_items=("quantity", "sum"),
            order_revenue=("price", "sum"),
            order_freight=("freight_value", "sum"),
            order_total_value=("total_item_value", "sum")
        ).reset_index()

        merged = pd.merge(agg, top_cats, on="order_id", how="left")
        merged = pd.merge(merged, top_sellers, on="order_id", how="left")
        return merged
