import os
import sqlite3
from pathlib import Path
from typing import Dict, Any, Tuple
import pandas as pd
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.data.transformer import DataTransformer
from backend.app.utils.date_utils import add_date_features

class DataMerger:
    """
    Constructs unified analytical fact tables by combining cleaned dimension
    and transaction tables using safe 1-to-1 and 1-to-many aggregations.
    
    Guarantees that revenue and item counts are never multiplied by Cartesian joins.
    """
    def __init__(self, cleaned_tables: Dict[str, pd.DataFrame]):
        self.tables = cleaned_tables
        self.transformer = DataTransformer()
        self.fact_orders: pd.DataFrame = pd.DataFrame()
        self.fact_order_items: pd.DataFrame = pd.DataFrame()

    def build_fact_tables(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Builds fact_orders and fact_order_items tables with all enriched features.
        """
        logger.info("Building unified analytical fact tables...")

        orders = self.tables.get("orders")
        customers = self.tables.get("customers")
        order_items = self.tables.get("order_items")
        payments = self.tables.get("payments")
        reviews = self.tables.get("reviews")
        products = self.tables.get("products")
        sellers = self.tables.get("sellers")

        if orders is None or orders.empty:
            raise ValueError("Orders table is missing or empty.")

        # 1. Aggregate payments and reviews to 1-to-1 order grain
        agg_payments = self.transformer.aggregate_payments(payments if payments is not None else pd.DataFrame())
        agg_reviews = self.transformer.aggregate_reviews(reviews if reviews is not None else pd.DataFrame())

        # 2. Enrich order items with product and seller details
        enriched_items = self.transformer.enrich_order_items(
            order_items if order_items is not None else pd.DataFrame(),
            products if products is not None else pd.DataFrame(),
            sellers if sellers is not None else pd.DataFrame()
        )

        # 3. Aggregate item metrics to order grain
        agg_items = self.transformer.aggregate_items_by_order(enriched_items)

        # 4. Assemble fact_orders (Grain: 1 row per order)
        logger.info("Assembling fact_orders table...")
        df_orders = orders.copy()

        # Join customer information (1-to-1 on customer_id)
        if customers is not None and not customers.empty:
            cust_cols = ["customer_id", "customer_unique_id", "customer_city", "customer_state", "customer_region"]
            df_orders = pd.merge(df_orders, customers[cust_cols], on="customer_id", how="left")

        # Join aggregated item statistics (1-to-1 on order_id)
        df_orders = pd.merge(df_orders, agg_items, on="order_id", how="left")

        # Join aggregated payment statistics (1-to-1 on order_id)
        df_orders = pd.merge(df_orders, agg_payments, on="order_id", how="left")

        # Join review score (1-to-1 on order_id)
        df_orders = pd.merge(df_orders, agg_reviews, on="order_id", how="left")

        # Handle nulls in aggregated numerical columns
        df_orders["order_revenue"] = df_orders["order_revenue"].fillna(0.0)
        df_orders["order_freight"] = df_orders["order_freight"].fillna(0.0)
        df_orders["order_total_value"] = df_orders["order_total_value"].fillna(df_orders["total_payment_value"].fillna(0.0))
        df_orders["total_items"] = df_orders["total_items"].fillna(0).astype(int)
        df_orders["primary_payment_type"] = df_orders["primary_payment_type"].fillna("other")
        df_orders["category"] = df_orders["category"].fillna("Others")
        df_orders["customer_city"] = df_orders["customer_city"].fillna("Unknown")
        df_orders["customer_state"] = df_orders["customer_state"].fillna("Unknown")
        df_orders["customer_region"] = df_orders["customer_region"].fillna("Other")

        # Add calendar dimension features
        df_orders = add_date_features(df_orders, "order_purchase_timestamp")
        self.fact_orders = df_orders

        # 5. Assemble fact_order_items (Grain: 1 row per order item)
        logger.info("Assembling fact_order_items table...")
        if not enriched_items.empty:
            df_items = enriched_items.copy()

            # Join order metadata (order_status, purchase timestamp, customer_id)
            order_subset_cols = ["order_id", "customer_id", "order_status", "order_purchase_timestamp"]
            df_items = pd.merge(df_items, orders[order_subset_cols], on="order_id", how="left")

            # Join customer location
            if customers is not None and not customers.empty:
                cust_cols = ["customer_id", "customer_unique_id", "customer_city", "customer_state", "customer_region"]
                df_items = pd.merge(df_items, customers[cust_cols], on="customer_id", how="left")

            # Join primary payment method and review score
            if not agg_payments.empty:
                df_items = pd.merge(df_items, agg_payments[["order_id", "primary_payment_type"]], on="order_id", how="left")
            if not agg_reviews.empty:
                df_items = pd.merge(df_items, agg_reviews[["order_id", "order_review_score"]], on="order_id", how="left")

            df_items["customer_city"] = df_items["customer_city"].fillna("Unknown")
            df_items["customer_state"] = df_items["customer_state"].fillna("Unknown")
            df_items["customer_region"] = df_items["customer_region"].fillna("Other")
            df_items["primary_payment_type"] = df_items["primary_payment_type"].fillna("other")

            # Add calendar features to items table as well
            df_items = add_date_features(df_items, "order_purchase_timestamp")
            self.fact_order_items = df_items
        else:
            self.fact_order_items = pd.DataFrame()

        logger.info(
            f"Fact tables created successfully: fact_orders ({len(self.fact_orders):,} rows), "
            f"fact_order_items ({len(self.fact_order_items):,} rows)"
        )
        return self.fact_orders, self.fact_order_items

    def save_processed(self, output_dir: Path = None):
        """
        Persists fact tables to high-performance Parquet format and creates SQLite database.
        """
        out_dir = Path(output_dir) if output_dir else settings.DATA_PROCESSED_DIR
        out_dir.mkdir(parents=True, exist_ok=True)

        # Also copy to root data/processed if different
        alt_dir = settings.WORKSPACE_DIR / "data" / "processed"
        alt_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"Saving analytical fact tables to {out_dir}...")

        # 1. Parquet storage
        orders_parquet = out_dir / "fact_orders.parquet"
        items_parquet = out_dir / "fact_order_items.parquet"

        self.fact_orders.to_parquet(orders_parquet, index=False)
        self.fact_order_items.to_parquet(items_parquet, index=False)

        # Root mirror
        if alt_dir != out_dir:
            self.fact_orders.to_parquet(alt_dir / "fact_orders.parquet", index=False)
            self.fact_order_items.to_parquet(alt_dir / "fact_order_items.parquet", index=False)

        logger.info(f"Saved Parquet files successfully.")

        # 2. SQLite Database with indexes
        db_path = out_dir / "sales_analytics.db"
        logger.info(f"Writing to SQLite database at {db_path}...")
        conn = sqlite3.connect(str(db_path))

        # Write tables
        # Convert datetime columns to string for SQLite compatibility
        orders_sql = self.fact_orders.copy()
        for col in orders_sql.select_dtypes(include=["datetime"]).columns:
            orders_sql[col] = orders_sql[col].dt.strftime("%Y-%m-%d %H:%M:%S")

        items_sql = self.fact_order_items.copy()
        for col in items_sql.select_dtypes(include=["datetime"]).columns:
            items_sql[col] = items_sql[col].dt.strftime("%Y-%m-%d %H:%M:%S")

        orders_sql.to_sql("fact_orders", conn, if_exists="replace", index=False)
        items_sql.to_sql("fact_order_items", conn, if_exists="replace", index=False)

        # Create indexes for fast analytical filtering
        cursor = conn.cursor()
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_orders_order_id ON fact_orders (order_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_orders_cust_id ON fact_orders (customer_unique_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_orders_date ON fact_orders (date_only);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_orders_state ON fact_orders (customer_state);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_orders_status ON fact_orders (order_status);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_items_product ON fact_order_items (product_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_items_category ON fact_order_items (product_category_name);")
        conn.commit()
        conn.close()

        logger.info(f"SQLite database created with indexes at {db_path}")
