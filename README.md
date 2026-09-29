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

## 2. Quick Start

### Installation
```bash
# Install dependencies
pip install -r requirements.txt
```

### Run Data Ingestion & Machine Learning Pipeline
```bash
python run.py pipeline
```

### Start FastAPI REST Server
```bash
python run.py api
```
- Interactive API Docs (Swagger): [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Interactive ReDoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- Health check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

### Run Tests
```bash
python -m pytest backend/tests/ -v
```

For full architecture details, endpoint schemas, RFM/K-Means mathematical explanations, and frontend integration code snippets, see [backend/README.md](file:///c:/Users/Admin/Desktop/Python%20Project/backend/README.md).
