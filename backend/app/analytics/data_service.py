from typing import Optional, Dict, Any, Tuple
from pathlib import Path
import pandas as pd
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.schemas.common import FilterParams

class AnalyticalDataService:
    """
    Singleton service managing the in-memory processed analytical tables,
    providing high-performance vectorized filtering and cached access.
    """
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(AnalyticalDataService, cls).__new__(cls)
            cls._instance.is_initialized = False
        return cls._instance

    def initialize(self, processed_dir: Optional[Path] = None):
        """
        Loads processed Parquet tables into memory.
        """
        if self.is_initialized:
            return

        p_dir = Path(processed_dir) if processed_dir else settings.DATA_PROCESSED_DIR
        # Fallback to root data/processed if needed
        if not (p_dir / "fact_orders.parquet").exists():
            alt_dir = settings.WORKSPACE_DIR / "data" / "processed"
            if (alt_dir / "fact_orders.parquet").exists():
                p_dir = alt_dir

        orders_path = p_dir / "fact_orders.parquet"
        items_path = p_dir / "fact_order_items.parquet"
        rfm_path = p_dir / "dim_customers_rfm.parquet"

        if not orders_path.exists():
            logger.warning(f"Analytical files not found at {p_dir}. Run pipeline first!")
            self.fact_orders = pd.DataFrame()
            self.fact_order_items = pd.DataFrame()
            self.dim_customers = pd.DataFrame()
            return

        logger.info(f"Loading analytical datasets from {p_dir} into memory...")
        self.fact_orders = pd.read_parquet(orders_path)
        self.fact_order_items = pd.read_parquet(items_path) if items_path.exists() else pd.DataFrame()
        self.dim_customers = pd.read_parquet(rfm_path) if rfm_path.exists() else pd.DataFrame()

        # Ensure datetime dtypes
        if "order_purchase_timestamp" in self.fact_orders.columns:
            self.fact_orders["order_purchase_timestamp"] = pd.to_datetime(self.fact_orders["order_purchase_timestamp"])
        if not self.fact_order_items.empty and "order_purchase_timestamp" in self.fact_order_items.columns:
            self.fact_order_items["order_purchase_timestamp"] = pd.to_datetime(self.fact_order_items["order_purchase_timestamp"])

        self.is_initialized = True
        logger.info(
            f"Analytical Data Service ready with {len(self.fact_orders):,} orders and "
            f"{len(self.fact_order_items):,} items."
        )

    def filter_orders(self, params: FilterParams) -> pd.DataFrame:
        """
        Applies fast vector filtering across all supported dimensions on fact_orders.
        """
        if self.fact_orders.empty:
            return self.fact_orders

        df = self.fact_orders
        mask = pd.Series(True, index=df.index)

        # Date range
        if params.date_from:
            mask &= (df["date_only"] >= params.date_from)
        if params.date_to:
            mask &= (df["date_only"] <= params.date_to)

        # Calendar
        if params.year is not None:
            mask &= (df["year"] == params.year)
        if params.month is not None:
            mask &= (df["month"] == params.month)

        # Geography
        if params.state:
            mask &= (df["customer_state"].str.lower() == params.state.lower())
        if params.city:
            mask &= (df["customer_city"].str.lower() == params.city.lower())
        if params.region:
            mask &= (df["customer_region"].str.lower() == params.region.lower())

        # Category
        if params.category:
            mask &= (df["category"].str.lower() == params.category.lower())

        # Payment
        if params.payment_method:
            mask &= (df["primary_payment_type"].str.lower() == params.payment_method.lower())

        # Seller
        if params.seller:
            if "primary_seller_id" in df.columns:
                mask &= (df["primary_seller_id"] == params.seller)
            elif "seller_id" in df.columns:
                mask &= (df["seller_id"] == params.seller)

        return df[mask]

    def filter_items(self, params: FilterParams) -> pd.DataFrame:
        """
        Applies vector filtering on item-level fact table.
        """
        if self.fact_order_items.empty:
            return self.fact_order_items

        df = self.fact_order_items
        mask = pd.Series(True, index=df.index)

        if params.date_from:
            mask &= (df["date_only"] >= params.date_from)
        if params.date_to:
            mask &= (df["date_only"] <= params.date_to)
        if params.year is not None:
            mask &= (df["year"] == params.year)
        if params.month is not None:
            mask &= (df["month"] == params.month)
        if params.state:
            mask &= (df["customer_state"].str.lower() == params.state.lower())
        if params.city:
            mask &= (df["customer_city"].str.lower() == params.city.lower())
        if params.region:
            mask &= (df["customer_region"].str.lower() == params.region.lower())
        if params.category:
            mask &= (df["product_category_name"].str.lower() == params.category.lower())
        if params.product:
            mask &= (df["product_id"] == params.product)
        if params.payment_method:
            mask &= (df["primary_payment_type"].str.lower() == params.payment_method.lower())
        if params.seller:
            mask &= (df["seller_id"] == params.seller)

        return df[mask]

data_service = AnalyticalDataService()
