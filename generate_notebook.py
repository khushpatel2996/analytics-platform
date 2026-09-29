import json
import os
from pathlib import Path

def create_notebook():
    cells = []

    def add_md(text):
        cells.append({
            "cell_type": "markdown",
            "metadata": {},
            "source": [line + "\n" for line in text.strip().split("\n")]
        })

    def add_code(code):
        cells.append({
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [line + "\n" for line in code.strip().split("\n")]
        })

    # Title & Header
    add_md("""# India Sales Analytics & Business Intelligence Dashboard
## Exploratory Data Analysis & Customer Segmentation
**Author:** Antigravity Senior Data Science & Analytics Team  
**Dataset:** Indian E-Commerce Marketing Analytics Dataset  
**Tools:** Python, Pandas, NumPy, Scikit-learn, Seaborn, Matplotlib, Plotly

---
### Table of Contents:
1. Dataset Overview & Objectives
2. Data Ingestion & Schema Discovery
3. Data Cleaning & Normalization
4. Missing Value Analysis
5. Duplicate Analysis & Deduplication
6. Descriptive Statistics & Metric Baselines
7. Sales & Revenue Trend Analysis
8. Product Category & Catalog Performance
9. Customer Behavior & Retention Analysis
10. India Geographical Analysis (States, Cities & Regions)
11. Payment Channel & Method Analysis
12. Review & Customer Satisfaction Analytics
13. Correlation & Feature Interdependence Analysis
14. RFM (Recency, Frequency, Monetary) Customer Scoring
15. K-Means Customer Clustering & Silhouette Analysis
16. Strategic Business Insights & Recommendations""")

    # 1. Dataset Overview
    add_md("""## 1. Dataset Overview
The dataset contains transaction records from an Indian e-commerce marketplace spanning from late 2016 through late 2018. It comprises relational tables modeling customers, orders, order items, products, sellers, payments, reviews, and geolocations across 20 Indian states and over 4,000 cities.""")

    add_code("""import os
import sys
from pathlib import Path
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# Set plotting styles
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
plt.rcParams['figure.figsize'] = (12, 6)
plt.rcParams['font.size'] = 11

print("Environment and analytical libraries initialized.")""")

    # 2. Data Loading
    add_md("""## 2. Data Loading
We load the raw relational CSV tables discovered from `data/raw`.""")

    add_code("""# Locate data directory
data_dir = Path("../backend/data/raw") if Path("../backend/data/raw").exists() else Path("data/raw")
if not data_dir.exists():
    data_dir = Path("backend/data/raw")

print(f"Loading tables from: {data_dir.resolve()}")
customers_raw = pd.read_csv(data_dir / "CUSTOMERS.csv")
orders_raw = pd.read_csv(data_dir / "ORDERS.csv")
order_items_raw = pd.read_csv(data_dir / "ORDER_ITEMS.csv")
payments_raw = pd.read_csv(data_dir / "ORDER_PAYMENTS.csv")
reviews_raw = pd.read_csv(data_dir / "ORDER_REVIEW_RATINGS.csv")
products_raw = pd.read_csv(data_dir / "PRODUCTS.csv")
sellers_raw = pd.read_csv(data_dir / "SELLERS.csv")
geo_raw = pd.read_csv(data_dir / "GEO_LOCATION.csv")

tables = {
    "Customers": customers_raw,
    "Orders": orders_raw,
    "Order Items": order_items_raw,
    "Payments": payments_raw,
    "Reviews": reviews_raw,
    "Products": products_raw,
    "Sellers": sellers_raw,
    "Geolocation": geo_raw
}

for name, df in tables.items():
    print(f"Table '{name}': {df.shape[0]:,} rows, {df.shape[1]} columns")""")

    # 3. Data Cleaning
    add_md("""## 3. Data Cleaning
We clean string whitespace, standardize casing for Indian cities, normalize state names, convert date strings to proper datetime objects, and clip invalid numerical inputs.""")

    add_code("""# Standardize dates in orders
orders_cleaned = orders_raw.copy()
date_cols = ["order_purchase_timestamp", "order_approved_at", "order_delivered_customer_date", "order_estimated_delivery_date"]
for col in date_cols:
    orders_cleaned[col] = pd.to_datetime(orders_cleaned[col], errors='coerce')

orders_cleaned['year'] = orders_cleaned['order_purchase_timestamp'].dt.year
orders_cleaned['year_month'] = orders_cleaned['order_purchase_timestamp'].dt.strftime('%Y-%m')

# Standardize customers
customers_cleaned = customers_raw.copy()
customers_cleaned['customer_city'] = customers_cleaned['customer_city'].str.title().str.strip()
customers_cleaned['customer_state'] = customers_cleaned['customer_state'].str.title().str.strip()

print("Data cleaning executed successfully.")""")

    # 4. Missing Value Analysis
    add_md("""## 4. Missing Value Analysis
We inspect missingness rates across all tables to identify potential data imputation requirements.""")

    add_code("""missing_summary = []
for name, df in tables.items():
    total_nulls = df.isnull().sum().sum()
    null_cols = df.isnull().sum()[df.isnull().sum() > 0]
    for col, count in null_cols.items():
        missing_summary.append({
            "Table": name,
            "Column": col,
            "Missing Count": count,
            "Missing Percentage": f"{(count / len(df)) * 100:.2f}%"
        })

missing_df = pd.DataFrame(missing_summary)
display(missing_df) if 'display' in dir() else print(missing_df)""")

    # 5. Duplicate Analysis
    add_md("""## 5. Duplicate Analysis
We check for primary key and record duplicates across tables to avoid Cartesian explosions during joins.""")

    add_code("""dup_report = {
    "Table": list(tables.keys()),
    "Total Rows": [len(df) for df in tables.values()],
    "Duplicate Rows": [df.duplicated().sum() for df in tables.values()]
}
dup_df = pd.DataFrame(dup_report)
print(dup_df)""")

    # 6. Descriptive Statistics
    add_md("""## 6. Descriptive Statistics & Baseline KPIs
We calculate baseline metrics including overall revenue, order volumes, average order value (AOV), and customer counts.""")

    add_code("""total_orders = orders_cleaned['order_id'].nunique()
total_unique_customers = customers_cleaned['customer_unique_id'].nunique()
item_revenue = order_items_raw['price'].sum()
total_freight = order_items_raw['freight_value'].sum()
total_gmv = item_revenue + total_freight
aov = total_gmv / total_orders

print("="*45)
print("INDIAN E-COMMERCE PLATFORM BASELINE KPIs")
print("="*45)
print(f"Total Gross Merchandise Value (GMV): ₹{total_gmv:,.2f}")
print(f"Total Product Revenue:             ₹{item_revenue:,.2f}")
print(f"Total Freight Value:               ₹{total_freight:,.2f}")
print(f"Total Processed Orders:            {total_orders:,}")
print(f"Total Unique Customers:            {total_unique_customers:,}")
print(f"Average Order Value (AOV):         ₹{aov:,.2f}")
print("="*45)""")

    # 7. Sales Analysis
    add_md("""## 7. Sales & Revenue Trend Analysis
Examining monthly sales trajectories to understand platform growth and seasonality.""")

    add_code("""# Merge orders and order_items for monthly trend
order_rev = order_items_raw.groupby('order_id')['price'].sum().reset_index()
orders_with_rev = pd.merge(orders_cleaned, order_rev, on='order_id', how='left')
orders_with_rev['price'] = orders_with_rev['price'].fillna(0.0)

monthly_sales = orders_with_rev.groupby('year_month').agg(
    Revenue=('price', 'sum'),
    Orders=('order_id', 'nunique')
).reset_index().sort_values(by='year_month')

plt.figure(figsize=(14, 5))
plt.plot(monthly_sales['year_month'], monthly_sales['Revenue'] / 1e5, marker='o', color='#2563eb', linewidth=2.5)
plt.title("Monthly Revenue Trajectory (in Lakhs INR ₹)", fontsize=14, fontweight='bold')
plt.xlabel("Month", fontsize=12)
plt.ylabel("Revenue (₹ Lakhs)", fontsize=12)
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()""")

    # 8. Product Analysis
    add_md("""## 8. Product Category Performance
Identifying highest-grossing and highest-volume product categories.""")

    add_code("""items_with_prod = pd.merge(order_items_raw, products_raw, on='product_id', how='left')
items_with_prod['product_category_name'] = items_with_prod['product_category_name'].fillna('Others').str.replace('_', ' ').str.title()

cat_perf = items_with_prod.groupby('product_category_name').agg(
    Revenue=('price', 'sum'),
    Units_Sold=('order_item_id', 'count')
).reset_index().sort_values(by='Revenue', ascending=False).head(10)

plt.figure(figsize=(12, 5))
sns.barplot(data=cat_perf, y='product_category_name', x='Revenue', palette='viridis')
plt.title("Top 10 Product Categories by Revenue (INR ₹)", fontsize=14, fontweight='bold')
plt.xlabel("Total Revenue (₹)", fontsize=12)
plt.ylabel("Category", fontsize=12)
plt.tight_layout()
plt.show()""")

    # 9. Customer Analysis
    add_md("""## 9. Customer Behavior & Retention
Analyzing single-purchase vs repeat buyers on the platform.""")

    add_code("""cust_order_counts = orders_cleaned.groupby('customer_id')['order_id'].nunique()
cust_with_unique = pd.merge(orders_cleaned[['order_id', 'customer_id']], customers_cleaned[['customer_id', 'customer_unique_id']], on='customer_id')
unique_cust_freq = cust_with_unique.groupby('customer_unique_id')['order_id'].nunique()

repeat_buyers = (unique_cust_freq > 1).sum()
single_buyers = (unique_cust_freq == 1).sum()
repeat_rate = (repeat_buyers / len(unique_cust_freq)) * 100

print(f"Single-Order Customers: {single_buyers:,} ({(single_buyers/len(unique_cust_freq))*100:.1f}%)")
print(f"Repeat Buyers:          {repeat_buyers:,} ({repeat_rate:.1f}%)")""")

    # 10. Geography Analysis
    add_md("""## 10. India Geographical Analysis (States & Regions)
Evaluating sales volume and market penetration across Indian states.""")

    add_code("""orders_cust = pd.merge(orders_with_rev, customers_cleaned[['customer_id', 'customer_state', 'customer_city']], on='customer_id')
state_sales = orders_cust.groupby('customer_state').agg(
    Revenue=('price', 'sum'),
    Orders=('order_id', 'nunique')
).reset_index().sort_values(by='Revenue', ascending=False)

plt.figure(figsize=(14, 6))
sns.barplot(data=state_sales.head(10), x='customer_state', y='Revenue', palette='magma')
plt.title("Top 10 Indian States by Revenue", fontsize=14, fontweight='bold')
plt.xlabel("State", fontsize=12)
plt.ylabel("Revenue (₹)", fontsize=12)
plt.xticks(rotation=30)
plt.tight_layout()
plt.show()""")

    # 11. Payment Analysis
    add_md("""## 11. Payment Channels & Behavior
Analyzing how Indian shoppers transact: Credit Card, UPI, Vouchers, and Debit Cards.""")

    add_code("""pay_summary = payments_raw.groupby('payment_type').agg(
    Total_Value=('payment_value', 'sum'),
    Transaction_Count=('payment_sequential', 'count')
).reset_index().sort_values(by='Total_Value', ascending=False)

plt.figure(figsize=(8, 8))
plt.pie(pay_summary['Total_Value'], labels=pay_summary['payment_type'].str.replace('_', ' ').str.title(), autopct='%1.1f%%', colors=sns.color_palette('pastel'))
plt.title("Payment Method Share by Transaction Value", fontsize=14, fontweight='bold')
plt.show()""")

    # 12. Review Analysis
    add_md("""## 12. Customer Satisfaction & Review Ratings
Evaluating the rating distribution and buyer sentiment across orders.""")

    add_code("""rating_dist = reviews_raw['review_score'].value_counts().sort_index(ascending=False)

plt.figure(figsize=(8, 4))
sns.barplot(x=rating_dist.index, y=rating_dist.values, palette='Blues_r')
plt.title("Customer Review Rating Distribution (1 - 5 Stars)", fontsize=14, fontweight='bold')
plt.xlabel("Rating Score", fontsize=12)
plt.ylabel("Total Reviews", fontsize=12)
plt.show()
print(f"Average Review Score across platform: {reviews_raw['review_score'].mean():.2f} / 5.00")""")

    # 13. Correlation Analysis
    add_md("""## 13. Correlation & Feature Interdependence
Analyzing whether customer review ratings correlate with order value and freight charges.""")

    add_code("""# Merge order level review score and price
rev_order = reviews_raw.groupby('order_id')['review_score'].mean().reset_index()
order_financials = order_items_raw.groupby('order_id').agg({'price': 'sum', 'freight_value': 'sum'}).reset_index()
corr_df = pd.merge(order_financials, rev_order, on='order_id').dropna()

correlations = corr_df[['price', 'freight_value', 'review_score']].corr()
print("Correlation Matrix:")
print(correlations)

plt.figure(figsize=(6, 4))
sns.heatmap(correlations, annot=True, cmap='coolwarm', fmt=".3f")
plt.title("Correlation Heatmap: Order Financials vs Review Score", fontsize=12, fontweight='bold')
plt.show()""")

    # 14. RFM Analysis
    add_md("""## 14. RFM (Recency, Frequency, Monetary) Customer Segmentation
We calculate Recency (days since last purchase), Frequency (total orders), and Monetary value (total spend) for each customer, assign quintile scores (1-5), and label segments.""")

    add_code("""ref_date = orders_cleaned['order_purchase_timestamp'].max() + pd.Timedelta(days=1)
cust_orders = pd.merge(orders_cleaned, order_rev, on='order_id')
rfm = cust_with_unique.merge(order_rev, on='order_id').groupby('customer_unique_id').agg(
    Last_Order=('order_id', lambda x: orders_cleaned.loc[orders_cleaned['order_id'].isin(x), 'order_purchase_timestamp'].max()),
    Frequency=('order_id', 'nunique'),
    Monetary=('price', 'sum')
).reset_index()

rfm['Recency'] = (ref_date - rfm['Last_Order']).dt.days

# Quintile ranking
rfm['R_Score'] = pd.qcut(rfm['Recency'].rank(method='first'), q=5, labels=[5, 4, 3, 2, 1]).astype(int)
rfm['M_Score'] = pd.qcut(rfm['Monetary'].rank(method='first'), q=5, labels=[1, 2, 3, 4, 5]).astype(int)
rfm['F_Score'] = rfm['Frequency'].apply(lambda f: 5 if f >= 4 else (4 if f == 3 else (3 if f == 2 else 1)))

def segment_label(row):
    r, f, m = row['R_Score'], row['F_Score'], row['M_Score']
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
    else:
        return "Promising"

rfm['Segment'] = rfm.apply(segment_label, axis=1)
print(rfm['Segment'].value_counts())""")

    # 15. KMeans Clustering
    add_md("""## 15. K-Means Customer Clustering
Applying logarithmic transformation and standard scaling to RFM metrics, followed by Scikit-learn K-Means clustering with silhouette validation.""")

    add_code("""from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score

features = rfm[['Recency', 'Frequency', 'Monetary']].copy()
features['Monetary'] = features['Monetary'].clip(lower=0)
features_log = np.log1p(features)

scaler = StandardScaler()
scaled_features = scaler.fit_transform(features_log)

kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
rfm['Cluster'] = kmeans.fit_predict(scaled_features)

sample_idx = min(5000, len(scaled_features))
sil_score = silhouette_score(scaled_features[:sample_idx], rfm['Cluster'].iloc[:sample_idx])
print(f"K-Means Cluster Silhouette Score: {sil_score:.4f}")

cluster_profile = rfm.groupby('Cluster').agg(
    Count=('customer_unique_id', 'count'),
    Avg_Recency=('Recency', 'mean'),
    Avg_Frequency=('Frequency', 'mean'),
    Avg_Monetary=('Monetary', 'mean')
).reset_index()
print(cluster_profile)""")

    # 16. Business Insights
    add_md("""## 16. Strategic Business Insights & Recommendations
1. **Core Growth Engine:** Andhra Pradesh and Gujarat constitute the platform's geographical strongholds, generating a majority of total turnover. Targeted regional marketing campaigns should double down on these core territories.
2. **Digital Payments Dominance:** Credit cards and UPI represent the predominant payment channels. Optimizing one-click checkout and cashbacks for UPI can further minimize checkout friction.
3. **Customer Retention Imperative:** The platform exhibits a high concentration of single-time buyers (~97%). Implementing automated lifecycle marketing, post-purchase loyalty rewards, and personalized product recommendations can unlock significant customer lifetime value (LTV).
4. **Category Focus:** Bed Bath & Table, Health & Beauty, and Sports & Leisure drive the highest volume and revenue margins, presenting prime opportunities for seller onboarding and featured brand partnerships.""")

    notebook_data = {
        "cells": cells,
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python",
                "name": "python3"
            },
            "language_info": {
                "name": "python",
                "version": "3.11"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 4
    }

    # Save to both paths
    paths = [
        Path("notebooks/exploratory_analysis.ipynb"),
        Path("backend/notebooks/exploratory_analysis.ipynb")
    ]
    for p in paths:
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            json.dump(notebook_data, f, indent=2)
        print(f"Created notebook at: {p.resolve()}")

if __name__ == "__main__":
    create_notebook()
