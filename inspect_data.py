import os
import shutil
import glob
import pandas as pd
import numpy as np

def setup_and_inspect():
    # Target directories
    dirs = [
        "backend/data/raw",
        "backend/data/processed",
        "backend/models",
        "backend/notebooks",
        "backend/tests",
        "data/raw",
        "data/processed"
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)

    # Source files in temp_clone
    source_csvs = glob.glob("temp_clone/*.csv")
    print(f"Found {len(source_csvs)} source CSV files in temp_clone:")
    for src in source_csvs:
        fname = os.path.basename(src)
        dst1 = os.path.join("backend/data/raw", fname)
        dst2 = os.path.join("data/raw", fname)
        if not os.path.exists(dst1) or os.path.getsize(dst1) == 0:
            shutil.copy2(src, dst1)
        if not os.path.exists(dst2) or os.path.getsize(dst2) == 0:
            shutil.copy2(src, dst2)
        print(f" - Copied {fname} to raw directories")

    raw_dir = "backend/data/raw"
    files = glob.glob(os.path.join(raw_dir, "*.csv"))
    print("\n" + "="*60)
    print("PHASE 1: DATASET INSPECTION REPORT")
    print("="*60)

    tables = {}
    for f in sorted(files):
        name = os.path.basename(f)
        df = pd.read_csv(f)
        tables[name] = df
        print(f"\n--- Table: {name} ---")
        print(f"Shape: {df.shape[0]:,} rows, {df.shape[1]} columns")
        print(f"Duplicates: {df.duplicated().sum():,}")
        print("Columns & Missing Values:")
        for col in df.columns:
            null_count = df[col].isnull().sum()
            pct = (null_count / len(df)) * 100
            dtype = df[col].dtype
            print(f"  - {col} ({dtype}): {null_count:,} missing ({pct:.2f}%)")

    # Inspect relationships
    print("\n" + "="*60)
    print("RELATIONSHIP & INTEGRITY CHECKS")
    print("="*60)
    
    customers = tables.get("CUSTOMERS.csv")
    orders = tables.get("ORDERS.csv")
    order_items = tables.get("ORDER_ITEMS.csv")
    payments = tables.get("ORDER_PAYMENTS.csv")
    reviews = tables.get("ORDER_REVIEW_RATINGS.csv")
    products = tables.get("PRODUCTS.csv")
    sellers = tables.get("SELLERS.csv")
    geo = tables.get("GEO_LOCATION.csv")

    if customers is not None and orders is not None:
        c_ids = set(customers["customer_id"].dropna())
        o_cids = set(orders["customer_id"].dropna())
        print(f"Total customers: {len(customers):,}, Unique customer_id: {customers['customer_id'].nunique():,}, Unique customer_unique_id: {customers['customer_unique_id'].nunique():,}")
        print(f"Orders customer_id in Customers: {len(o_cids.intersection(c_ids)):,} / {len(o_cids):,}")

    if orders is not None and order_items is not None:
        o_ids = set(orders["order_id"].dropna())
        oi_oids = set(order_items["order_id"].dropna())
        print(f"Total orders: {len(orders):,}, Unique order_id: {orders['order_id'].nunique():,}")
        print(f"Order items order_id in Orders: {len(oi_oids.intersection(o_ids)):,} / {len(oi_oids):,}")

    if orders is not None and payments is not None:
        pay_oids = set(payments["order_id"].dropna())
        print(f"Payments order_id in Orders: {len(pay_oids.intersection(o_ids)):,} / {len(pay_oids):,}")

    if orders is not None and reviews is not None:
        rev_oids = set(reviews["order_id"].dropna())
        print(f"Reviews order_id in Orders: {len(rev_oids.intersection(o_ids)):,} / {len(rev_oids):,}")

    if products is not None and order_items is not None:
        p_ids = set(products["product_id"].dropna())
        oi_pids = set(order_items["product_id"].dropna())
        print(f"Order items product_id in Products: {len(oi_pids.intersection(p_ids)):,} / {len(oi_pids):,}")

    if sellers is not None and order_items is not None:
        s_ids = set(sellers["seller_id"].dropna())
        oi_sids = set(order_items["seller_id"].dropna())
        print(f"Order items seller_id in Sellers: {len(oi_sids.intersection(s_ids)):,} / {len(oi_sids):,}")

    # Inspect categorical distributions
    if customers is not None:
        print("\nTop Customer States:")
        print(customers["customer_state"].value_counts().head(10))
        print(f"Total unique customer states: {customers['customer_state'].nunique()}")
        print(f"Total unique customer cities: {customers['customer_city'].nunique()}")

    if orders is not None:
        print("\nOrder Statuses:")
        print(orders["order_status"].value_counts())
        print("\nDate range (order_purchase_timestamp):")
        ts = pd.to_datetime(orders["order_purchase_timestamp"], errors="coerce")
        print(f"Min date: {ts.min()}, Max date: {ts.max()}")

    if payments is not None:
        print("\nPayment Types:")
        print(payments["payment_type"].value_counts())

    if products is not None:
        print("\nTop Product Categories:")
        print(products["product_category_name"].value_counts().head(10))
        print(f"Total unique categories: {products['product_category_name'].nunique()}")

if __name__ == "__main__":
    setup_and_inspect()
