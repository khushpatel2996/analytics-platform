from typing import Dict, Any, Tuple
import pandas as pd
import numpy as np
from backend.app.core.logging import logger
from backend.app.utils.formatting import clean_string

# Standard Indian state names mapping for normalization
INDIAN_STATES_CANONICAL = {
    "andhra pradesh": "Andhra Pradesh",
    "arunachal pradesh": "Arunachal Pradesh",
    "assam": "Assam",
    "bihar": "Bihar",
    "chhattisgarh": "Chhattisgarh",
    "goa": "Goa",
    "gujarat": "Gujarat",
    "haryana": "Haryana",
    "himachal pradesh": "Himachal Pradesh",
    "jammu & kashmir": "Jammu & Kashmir",
    "jammu and kashmir": "Jammu & Kashmir",
    "jharkhand": "Jharkhand",
    "karnataka": "Karnataka",
    "kerala": "Kerala",
    "madhya pradesh": "Madhya Pradesh",
    "maharashtra": "Maharashtra",
    "manipur": "Manipur",
    "meghalaya": "Meghalaya",
    "mizoram": "Mizoram",
    "nagaland": "Nagaland",
    "odisha": "Odisha",
    "orissa": "Odisha", # Standardize historical spelling
    "punjab": "Punjab",
    "rajasthan": "Rajasthan",
    "sikkim": "Sikkim",
    "tamil nadu": "Tamil Nadu",
    "telangana": "Telangana",
    "tripura": "Tripura",
    "uttar pradesh": "Uttar Pradesh",
    "uttaranchal": "Uttarakhand", # Standardize historical name
    "uttarakhand": "Uttarakhand",
    "west bengal": "West Bengal",
    "delhi": "Delhi",
    "chandigarh": "Chandigarh",
    "puducherry": "Puducherry",
    "pondicherry": "Puducherry"
}

INDIAN_REGION_MAPPING = {
    "Delhi": "North",
    "Haryana": "North",
    "Himachal Pradesh": "North",
    "Jammu & Kashmir": "North",
    "Punjab": "North",
    "Rajasthan": "North",
    "Uttar Pradesh": "North",
    "Uttarakhand": "North",
    "Chandigarh": "North",
    "Andhra Pradesh": "South",
    "Karnataka": "South",
    "Kerala": "South",
    "Tamil Nadu": "South",
    "Telangana": "South",
    "Puducherry": "South",
    "Goa": "West",
    "Gujarat": "West",
    "Maharashtra": "West",
    "Odisha": "East",
    "West Bengal": "East",
    "Bihar": "East",
    "Jharkhand": "East",
    "Chhattisgarh": "Central",
    "Madhya Pradesh": "Central",
    "Arunachal Pradesh": "Northeast",
    "Assam": "Northeast",
    "Manipur": "Northeast",
    "Meghalaya": "Northeast",
    "Mizoram": "Northeast",
    "Nagaland": "Northeast",
    "Sikkim": "Northeast",
    "Tripura": "Northeast"
}

def normalize_state_name(state_raw: Any) -> str:
    """Standardizes state names to official Indian state nomenclature."""
    s = clean_string(state_raw).lower()
    return INDIAN_STATES_CANONICAL.get(s, clean_string(state_raw).title())

def get_region_for_state(state: str) -> str:
    """Returns the Indian geographic region for a state."""
    return INDIAN_REGION_MAPPING.get(state, "Other")

class DataCleaner:
    """
    Cleans all ingested raw tables, enforces data types, handles nulls,
    removes duplicates, and standardizes geography and identifiers.
    """
    def __init__(self, tables: Dict[str, pd.DataFrame]):
        self.raw_tables = tables
        self.cleaned_tables: Dict[str, pd.DataFrame] = {}
        self.cleaning_report: Dict[str, Any] = {
            "tables": {},
            "total_original_rows": 0,
            "total_cleaned_rows": 0,
            "total_duplicates_removed": 0
        }

    def clean_all(self) -> Dict[str, pd.DataFrame]:
        """Runs the entire cleaning pipeline across all discovered tables."""
        logger.info("Starting comprehensive data cleaning pipeline...")

        if "customers" in self.raw_tables:
            self.cleaned_tables["customers"] = self.clean_customers(self.raw_tables["customers"])
        if "orders" in self.raw_tables:
            self.cleaned_tables["orders"] = self.clean_orders(self.raw_tables["orders"])
        if "order_items" in self.raw_tables:
            self.cleaned_tables["order_items"] = self.clean_order_items(self.raw_tables["order_items"])
        if "payments" in self.raw_tables:
            self.cleaned_tables["payments"] = self.clean_payments(self.raw_tables["payments"])
        if "reviews" in self.raw_tables:
            self.cleaned_tables["reviews"] = self.clean_reviews(self.raw_tables["reviews"])
        if "products" in self.raw_tables:
            self.cleaned_tables["products"] = self.clean_products(self.raw_tables["products"])
        if "sellers" in self.raw_tables:
            self.cleaned_tables["sellers"] = self.clean_sellers(self.raw_tables["sellers"])
        if "geolocation" in self.raw_tables:
            self.cleaned_tables["geolocation"] = self.clean_geolocation(self.raw_tables["geolocation"])

        logger.info("Data cleaning completed successfully.")
        return self.cleaned_tables

    def _record_report(self, name: str, original_len: int, final_len: int, dups_removed: int,
                       nulls_handled: Dict[str, int], transformations: list):
        self.cleaning_report["tables"][name] = {
            "original_rows": original_len,
            "final_rows": final_len,
            "duplicates_removed": dups_removed,
            "missing_values_handled": nulls_handled,
            "columns_transformed": transformations
        }
        self.cleaning_report["total_original_rows"] += original_len
        self.cleaning_report["total_cleaned_rows"] += final_len
        self.cleaning_report["total_duplicates_removed"] += dups_removed

    def clean_customers(self, df: pd.DataFrame) -> pd.DataFrame:
        orig_len = len(df)
        df = df.copy()

        # Deduplicate
        dups = int(df.duplicated(subset=["customer_id"]).sum())
        if dups > 0:
            df = df.drop_duplicates(subset=["customer_id"])

        # String stripping
        for col in ["customer_id", "customer_unique_id", "customer_city", "customer_state"]:
            if col in df.columns:
                df[col] = df[col].astype(str).str.strip()

        # Geography standardization
        df["customer_city"] = df["customer_city"].str.title()
        df["customer_state"] = df["customer_state"].apply(normalize_state_name)
        df["customer_region"] = df["customer_state"].apply(get_region_for_state)

        nulls = df.isnull().sum().to_dict()
        self._record_report("customers", orig_len, len(df), dups, nulls,
                            ["strip_strings", "title_case_city", "normalize_state", "add_region"])
        logger.info(f"Cleaned customers: {orig_len:,} -> {len(df):,} rows")
        return df

    def clean_orders(self, df: pd.DataFrame) -> pd.DataFrame:
        orig_len = len(df)
        df = df.copy()

        dups = int(df.duplicated(subset=["order_id"]).sum())
        if dups > 0:
            df = df.drop_duplicates(subset=["order_id"])

        # Clean strings
        df["order_id"] = df["order_id"].astype(str).str.strip()
        df["customer_id"] = df["customer_id"].astype(str).str.strip()
        df["order_status"] = df["order_status"].astype(str).str.strip().str.lower()

        # Date parsing
        date_cols = [
            "order_purchase_timestamp",
            "order_approved_at",
            "order_delivered_carrier_date",
            "order_delivered_customer_date",
            "order_estimated_delivery_date"
        ]
        for col in date_cols:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors="coerce")

        # Fill missing order_status
        df["order_status"] = df["order_status"].fillna("unknown")

        nulls = df.isnull().sum().to_dict()
        self._record_report("orders", orig_len, len(df), dups, nulls,
                            ["clean_ids", "lower_status", "parse_timestamps"])
        logger.info(f"Cleaned orders: {orig_len:,} -> {len(df):,} rows")
        return df

    def clean_order_items(self, df: pd.DataFrame) -> pd.DataFrame:
        orig_len = len(df)
        df = df.copy()

        # Deduplicate exact rows
        dups = int(df.duplicated(subset=["order_id", "order_item_id"]).sum())
        if dups > 0:
            df = df.drop_duplicates(subset=["order_id", "order_item_id"])

        for col in ["order_id", "product_id", "seller_id"]:
            if col in df.columns:
                df[col] = df[col].astype(str).str.strip()

        if "shipping_limit_date" in df.columns:
            df["shipping_limit_date"] = pd.to_datetime(df["shipping_limit_date"], errors="coerce")

        # Ensure numeric values are valid
        df["price"] = pd.to_numeric(df["price"], errors="coerce").fillna(0.0)
        df["freight_value"] = pd.to_numeric(df["freight_value"], errors="coerce").fillna(0.0)
        # Fix negative values if any
        df["price"] = df["price"].clip(lower=0.0)
        df["freight_value"] = df["freight_value"].clip(lower=0.0)
        df["total_item_value"] = df["price"] + df["freight_value"]
        df["quantity"] = 1

        nulls = df.isnull().sum().to_dict()
        self._record_report("order_items", orig_len, len(df), dups, nulls,
                            ["clean_ids", "parse_numeric", "calculate_item_value"])
        logger.info(f"Cleaned order_items: {orig_len:,} -> {len(df):,} rows")
        return df

    def clean_payments(self, df: pd.DataFrame) -> pd.DataFrame:
        orig_len = len(df)
        df = df.copy()

        df["order_id"] = df["order_id"].astype(str).str.strip()
        df["payment_type"] = df["payment_type"].astype(str).str.strip().str.lower()
        # Map not_defined or obscure types
        df["payment_type"] = df["payment_type"].replace({"not_defined": "other", "": "other", "nan": "other"})
        df["payment_installments"] = pd.to_numeric(df["payment_installments"], errors="coerce").fillna(1).astype(int).clip(lower=1)
        df["payment_value"] = pd.to_numeric(df["payment_value"], errors="coerce").fillna(0.0).clip(lower=0.0)

        dups = int(df.duplicated().sum())
        if dups > 0:
            df = df.drop_duplicates()

        nulls = df.isnull().sum().to_dict()
        self._record_report("payments", orig_len, len(df), dups, nulls,
                            ["clean_payment_types", "clip_installments_and_value"])
        logger.info(f"Cleaned payments: {orig_len:,} -> {len(df):,} rows")
        return df

    def clean_reviews(self, df: pd.DataFrame) -> pd.DataFrame:
        orig_len = len(df)
        df = df.copy()

        df["review_id"] = df["review_id"].astype(str).str.strip()
        df["order_id"] = df["order_id"].astype(str).str.strip()

        # Parse review score (1-5)
        df["review_score"] = pd.to_numeric(df["review_score"], errors="coerce").fillna(5).astype(int).clip(1, 5)

        for col in ["review_creation_date", "review_answer_timestamp"]:
            if col in df.columns:
                df[col] = pd.to_datetime(df[col], errors="coerce")

        # Deduplicate: if multiple reviews exist for an order, keep latest
        if "review_answer_timestamp" in df.columns:
            df = df.sort_values(by="review_answer_timestamp", ascending=True)
        dups = int(df.duplicated(subset=["order_id"]).sum())
        df = df.drop_duplicates(subset=["order_id"], keep="last")

        nulls = df.isnull().sum().to_dict()
        self._record_report("reviews", orig_len, len(df), dups, nulls,
                            ["clip_review_score", "parse_timestamps", "dedup_order_reviews"])
        logger.info(f"Cleaned reviews: {orig_len:,} -> {len(df):,} rows")
        return df

    def clean_products(self, df: pd.DataFrame) -> pd.DataFrame:
        orig_len = len(df)
        df = df.copy()

        dups = int(df.duplicated(subset=["product_id"]).sum())
        if dups > 0:
            df = df.drop_duplicates(subset=["product_id"])

        df["product_id"] = df["product_id"].astype(str).str.strip()

        # Normalize category
        df["product_category_name"] = df["product_category_name"].fillna("Others")
        df["product_category_name"] = df["product_category_name"].astype(str).str.replace("_", " ").str.title().str.strip()
        df["product_category_name"] = df["product_category_name"].replace({"": "Others", "Nan": "Others"})

        # Numeric dimensions
        numeric_cols = [
            "product_name_lenght", "product_description_lenght",
            "product_photos_qty", "product_weight_g",
            "product_length_cm", "product_height_cm", "product_width_cm"
        ]
        for col in numeric_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)

        nulls = df.isnull().sum().to_dict()
        self._record_report("products", orig_len, len(df), dups, nulls,
                            ["clean_categories", "fill_numeric_dimensions"])
        logger.info(f"Cleaned products: {orig_len:,} -> {len(df):,} rows")
        return df

    def clean_sellers(self, df: pd.DataFrame) -> pd.DataFrame:
        orig_len = len(df)
        df = df.copy()

        dups = int(df.duplicated(subset=["seller_id"]).sum())
        if dups > 0:
            df = df.drop_duplicates(subset=["seller_id"])

        df["seller_id"] = df["seller_id"].astype(str).str.strip()
        df["seller_city"] = df["seller_city"].fillna("Unknown").astype(str).str.title().str.strip()
        df["seller_state"] = df["seller_state"].fillna("Unknown").apply(normalize_state_name)
        df["seller_region"] = df["seller_state"].apply(get_region_for_state)

        nulls = df.isnull().sum().to_dict()
        self._record_report("sellers", orig_len, len(df), dups, nulls,
                            ["clean_seller_geo", "normalize_seller_state", "add_seller_region"])
        logger.info(f"Cleaned sellers: {orig_len:,} -> {len(df):,} rows")
        return df

    def clean_geolocation(self, df: pd.DataFrame) -> pd.DataFrame:
        orig_len = len(df)
        df = df.copy()

        # Normalize city and state
        df["geolocation_city"] = df["geolocation_city"].astype(str).str.title().str.strip()
        df["geolocation_state"] = df["geolocation_state"].apply(normalize_state_name)

        # Remove duplicate zip prefixes by averaging lat/lng
        dups = int(df.duplicated(subset=["geolocation_zip_code_prefix"]).sum())
        agg_geo = df.groupby(["geolocation_zip_code_prefix", "geolocation_state", "geolocation_city"]).agg({
            "geolocation_lat": "mean",
            "geolocation_lng": "mean"
        }).reset_index()

        nulls = agg_geo.isnull().sum().to_dict()
        self._record_report("geolocation", orig_len, len(agg_geo), dups, nulls,
                            ["dedup_by_zip_prefix", "average_coordinates", "normalize_states"])
        logger.info(f"Cleaned geolocation: {orig_len:,} -> {len(agg_geo):,} aggregated locations")
        return agg_geo

    def get_cleaning_report(self) -> Dict[str, Any]:
        return self.cleaning_report
