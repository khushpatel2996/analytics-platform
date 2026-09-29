# India Sales Analytics & Business Intelligence Dashboard (Backend)

A production-grade, modular, and high-performance Python REST API backend for an India-focused E-Commerce Sales Analytics & Business Intelligence Dashboard. Built to pair with a modern React/Lovable frontend, this system delivers real-time KPI monitoring, multidimensional sales trends, state-level geographical intelligence, RFM & K-Means customer segmentation, review sentiment correlation, and an automated data-driven insights engine.

---

## 1. Project Overview & Key Features

- **End-to-End Pipeline**: Automated discovery, loading, cleaning, deduplication, and feature engineering for Indian e-commerce transaction data.
- **Unified Analytical Model**: Reconciles orders, items, payments, products, sellers, customers, and reviews without Cartesian product duplication.
- **High-Performance In-Memory Query Engine**: Fast vector filtering (<20ms response time) across date ranges, 20 Indian states, 4,000+ cities, 71 categories, payment methods, and customer segments.
- **India Geographical Intelligence**: Comprehensive state, city, and regional performance breakdown (North, South, East, West, Central, Northeast).
- **Dual Segmentation Engine**:
  - **RFM Segmentation**: Rule-based quintile scoring assigning customers into actionable cohorts (*Champions*, *Loyal Customers*, *Potential Loyalists*, *New Customers*, *At Risk*, *Needs Attention*).
  - **K-Means Clustering**: Unsupervised machine learning with log-transformation, StandardScaler, and silhouette validation saved via Joblib.
- **Dynamic Business Insights Engine**: Automatically generates natural-language executive observations from filtered slices (category dominance, regional share, MoM growth trajectory, payment adoption).
- **Frontend-Ready JSON Contracts**: Recharts and Plotly compatible series formats (`labels`, `values`, `series`).

---

## 2. System Architecture & Directory Layout

```
backend/
│
├── app/
│   ├── main.py                     # FastAPI application entrypoint & middleware
│   │
│   ├── api/
│   │   ├── routes/
│   │   │   ├── overview.py         # /api/overview (KPIs & dashboard summary)
│   │   │   ├── sales.py            # /api/sales (trends, categories, payments)
│   │   │   ├── geography.py        # /api/geography (states, cities, regions)
│   │   │   ├── products.py         # /api/products (top products, categories)
│   │   │   ├── customers.py        # /api/customers (summary, segments, top)
│   │   │   ├── sellers.py          # /api/sellers (vendor rankings, distribution)
│   │   │   ├── payments.py         # /api/payments (method distribution & trends)
│   │   │   ├── reviews.py          # /api/reviews (rating distribution & correlation)
│   │   │   ├── insights.py         # /api/insights (dynamic business insights)
│   │   │   └── filters.py          # /api/filters, /api/metadata, /api/health
│   │   │
│   │   └── dependencies.py         # Query parameter parsing & validation
│   │
│   ├── core/
│   │   ├── config.py               # Pydantic Settings & environment config
│   │   └── logging.py              # Structured application logger
│   │
│   ├── data/
│   │   ├── loader.py               # CSV auto-discovery & encoding-safe ingestion
│   │   ├── cleaner.py              # Data cleaning, null handling & state normalization
│   │   ├── transformer.py          # Non-multiplying payment/review aggregations
│   │   └── merger.py               # Analytical fact tables builder (Parquet & SQLite)
│   │
│   ├── analytics/
│   │   ├── data_service.py         # In-memory analytical cache & vector filtering
│   │   ├── overview.py             # Overall KPI calculation service
│   │   ├── sales.py                # Sales trend and breakdown computations
│   │   ├── geography.py            # Indian states and cities analytics
│   │   ├── products.py             # Product performance & catalog analysis
│   │   ├── customers.py            # Customer retention & privacy-safe metrics
│   │   ├── sellers.py              # Seller metrics & geographic footprint
│   │   ├── payments.py             # Payment share & temporal breakdown
│   │   ├── reviews.py              # Rating distributions & score correlations
│   │   └── insights.py             # Real-time business insight generation engine
│   │
│   ├── ml/
│   │   ├── rfm.py                  # Recency, Frequency, Monetary scoring engine
│   │   ├── clustering.py           # K-Means clustering with StandardScaler & silhouette
│   │   └── model_manager.py        # Joblib artifact serialization & caching
│   │
│   ├── schemas/                    # Pydantic v2 validation & response contracts
│   │   ├── common.py
│   │   ├── overview.py
│   │   ├── sales.py
│   │   ├── geography.py
│   │   ├── products.py
│   │   └── customers.py
│   │
│   └── utils/
│       ├── date_utils.py           # Multi-format date parsing & calendar features
│       ├── formatting.py           # Currency, percentage, & text formatters
│       └── validation.py           # Date constraint & parameter validation
│
├── data/
│   ├── raw/                        # Source CSV tables
│   └── processed/                  # Parquet tables & sales_analytics.db SQLite
│
├── models/                         # Serialized Joblib models (KMeans, Scaler)
├── notebooks/
│   └── exploratory_analysis.ipynb  # Comprehensive Jupyter EDA notebook
├── tests/
│   ├── conftest.py
│   └── test_api_endpoints.py       # Full pytest suite
│
├── requirements.txt
├── .env.example
├── README.md
└── run.py                          # CLI runner for pipeline, tests, and API
```

---

## 3. Dataset Source & Relationships

Dataset: **E-Commerce Project - Marketing Analytics (Kaggle)**  
Relational Schema:
- `CUSTOMERS.csv` (`customer_id`, `customer_unique_id`, `customer_city`, `customer_state`)
- `ORDERS.csv` (`order_id`, `customer_id`, `order_status`, `order_purchase_timestamp`, timestamps)
- `ORDER_ITEMS.csv` (`order_id`, `order_item_id`, `product_id`, `seller_id`, `price`, `freight_value`)
- `ORDER_PAYMENTS.csv` (`order_id`, `payment_sequential`, `payment_type`, `payment_installments`, `payment_value`)
- `ORDER_REVIEW_RATINGS.csv` (`review_id`, `order_id`, `review_score`, timestamps)
- `PRODUCTS.csv` (`product_id`, `product_category_name`, weights & dimensions)
- `SELLERS.csv` (`seller_id`, `seller_city`, `seller_state`)
- `GEO_LOCATION.csv` (`geolocation_zip_code_prefix`, `geolocation_lat`, `geolocation_lng`, `geolocation_city`, `geolocation_state`)

### Join Strategy & Cartesian Prevention:
To prevent revenue inflation when an order has multiple items and multiple payment methods:
1. `ORDER_PAYMENTS` is pre-aggregated per `order_id` (summing `total_payment_value` and selecting `primary_payment_type`).
2. `ORDER_REVIEW_RATINGS` is aggregated per `order_id` (computing `order_review_score`).
3. `ORDER_ITEMS` is enriched with `products` and `sellers`.
4. Two unified fact tables are persisted:
   - `fact_orders`: Order-level grain (99,441 records).
   - `fact_order_items`: Line-item grain (112,650 records).

---

## 4. Installation & Environment Setup

### Prerequisites
- Python 3.11+
- Virtual environment (recommended)

```bash
# Clone or navigate to the project directory
cd "c:/Users/Admin/Desktop/Python Project"

# Install dependencies
pip install -r requirements.txt
```

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration values:
```env
DATA_PATH=backend/data/raw
PROCESSED_DATA_PATH=backend/data/processed
MODELS_DIR=backend/models
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173
DATABASE_URL=sqlite:///backend/data/processed/sales_analytics.db
DEBUG=False
```

---

## 5. Running the Data Pipeline & Machine Learning

Run the automated data ingestion, cleaning, fact-table creation, and model training:
```bash
python run.py pipeline
```
What this performs:
1. **Ingestion**: Scans `data/raw` and profiles 8 CSV files.
2. **Cleaning**: Handles null values, normalizes Indian state names, formats city names, cleans IDs, clips outliers.
3. **Merging**: Constructs `fact_orders` and `fact_order_items` tables, saving both high-speed Parquet files and an indexed SQLite database (`sales_analytics.db`).
4. **RFM & K-Means ML**: Computes Recency, Frequency, and Monetary scores for 95,560 unique customers, trains K-Means (k=4) with standard scaling, computes silhouette validation, and saves serialized Joblib artifacts to `backend/models/`.

---

## 6. Starting the REST API Server

```bash
# Start FastAPI with Uvicorn (default http://127.0.0.1:8000)
python run.py api

# Or run pipeline first and then launch API:
python run.py all
```

Interactive documentation:
- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 7. API Endpoints Reference

All endpoints return a standardized envelope:
```json
{
  "success": true,
  "data": { ... },
  "filters": { ... },
  "metadata": { ... }
}
```

| Method | Endpoint | Query Filters Supported | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Service liveness and loaded record count |
| `GET` | `/api/metadata` | None | Dataset parameters, date span, total entities |
| `GET` | `/api/filters` | None | Available filter values for dropdowns |
| `GET` | `/api/overview` | All filters | Platform KPIs, AOV, cancellation rates, previews |
| `GET` | `/api/sales/trend` | All filters, `granularity` | Daily, weekly, monthly, quarterly, yearly trends |
| `GET` | `/api/sales/category` | All filters, `limit` | Sales breakdown by product category |
| `GET` | `/api/sales/state` | All filters, `limit` | Sales breakdown by Indian state |
| `GET` | `/api/sales/city` | All filters, `limit` | Sales breakdown by Indian city |
| `GET` | `/api/sales/payment` | All filters | Sales breakdown by payment type |
| `GET` | `/api/products/top` | All filters, `metric`, `limit` | Top products by revenue, quantity, or orders |
| `GET` | `/api/products/categories` | All filters, `limit` | Category financial & unit performance |
| `GET` | `/api/customers/summary` | All filters | Retention rate, AOV, new customer trajectory |
| `GET` | `/api/customers/top` | All filters, `limit` | Anonymized top buyers by revenue |
| `GET` | `/api/customers/segments` | None | K-Means cluster profiling & RFM cohorts |
| `GET` | `/api/geography/states` | All filters | 20 Indian states metrics & regional aggregation |
| `GET` | `/api/geography/cities` | All filters, `limit` | Top Indian cities performance |
| `GET` | `/api/sellers/top` | All filters, `limit` | Top marketplace sellers by revenue |
| `GET` | `/api/payments/summary` | All filters | Payment methods share & temporal trends |
| `GET` | `/api/reviews/summary` | All filters | Star distribution (1-5) & revenue correlation |
| `GET` | `/api/insights` | All filters | Dynamically computed business observations |

---

## 8. Customer Segmentation Methodology

### RFM Analysis
- **Recency ($R$)**: Days elapsed from the customer's last purchase to the dataset reference cutoff.
- **Frequency ($F$)**: Count of distinct completed transactions by `customer_unique_id`.
- **Monetary ($M$)**: Sum of gross expenditure across all items and shipping fees.
- **Scoring Rubric**:
  - $R$-Score: 1 to 5 quintiles (inverted: lowest days = score 5).
  - $F$-Score: 1 (1 order), 3 (2 orders), 4 (3 orders), 5 (4+ orders).
  - $M$-Score: 1 to 5 quintiles (highest spend = score 5).
- **Cohort Classifications**:
  - **Champions**: $R \ge 4, F \ge 3, M \ge 4$ (Prime target for VIP perks).
  - **Loyal Customers**: $F \ge 3, M \ge 3$ (High retention, upsell candidates).
  - **Potential Loyalists**: $R \ge 4, F = 1, M \ge 3$ (High initial basket size; target for 2nd purchase).
  - **New Customers**: $R \ge 4, F = 1, M < 3$ (Recent acquisitions; onboarding sequence).
  - **At Risk**: $R \le 2, F \ge 3$ (Churning high-frequency buyers; win-back campaigns).
  - **Needs Attention**: $R \le 2, F < 3, M \ge 3$ (Above-average spenders lapsing).

### K-Means Clustering
1. **Feature Transformation**: $\log(1 + x)$ applied to $R, F, M$ to stabilize heavy right-skewed variances.
2. **Feature Scaling**: `StandardScaler()` normalizes features to $\mu=0, \sigma=1$.
3. **Model Selection**: $k=4$ clusters evaluated with Scikit-learn `silhouette_score` ($\approx 0.3845$).
4. **Cluster Profiles**:
   - Cluster 0: *Recent Active Buyers* (Low recency, average monetary).
   - Cluster 1: *High-Value Champions* (Highest monetary, above-average frequency).
   - Cluster 2: *Mid-Tier Regulars* (Moderate spend, steady cadence).
   - Cluster 3: *Dormant / Low-Value* (High recency, low spend).

---

## 9. Frontend Integration Contract (Lovable / React)

### CORS
CORS is preconfigured for standard React dev servers (`http://localhost:3000`, `http://localhost:5173`). Additional domains can be configured in `.env`.

### Connecting Recharts in React
All chart endpoints return direct Recharts-ready data structures:

```tsx
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function RevenueTrendChart({ stateFilter = '' }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const url = `http://127.0.0.1:8000/api/sales/trend?granularity=month${stateFilter ? `&state=${stateFilter}` : ''}`;
    fetch(url)
      .then(res => res.json())
      .then(payload => {
        if (payload.success) {
          setData(payload.data.trend);
        }
      });
  }, [stateFilter]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="period" />
        <YAxis />
        <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
        <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

---

## 10. Automated Testing

Run the test suite using pytest:
```bash
python -m pytest backend/tests/ -v
```
Verifies 100% pass rate across:
- Health check and metadata schemas
- Filter parameter combinations
- Invalid filter and date range error handling (HTTP 400 with `INVALID_FILTER` code)
- KPI precision and positive bounds
- Customer PII anonymization
- K-Means cluster profiling
- Review correlation boundaries
