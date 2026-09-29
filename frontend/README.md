# India Sales Analytics Dashboard - React Frontend

A modern, responsive, data-focused React + TypeScript Business Intelligence (BI) frontend for the **India Sales Analytics & Business Intelligence Platform**. Designed with a clean, light-first aesthetic and minimal visual clutter, it connects directly with the live FastAPI backend to deliver real-time KPIs, Recharts data visualizations, state/city level intelligence, customer segmentation cohorts, and dynamic business insights.

---

## 1. Project Overview & Features

- **10 Dedicated Analytics Modules**:
  1. **Dashboard** (`/dashboard`): Platform KPIs, monthly revenue/order trajectories, top categories/states, payment shares, and dynamic observations.
  2. **Sales Analytics** (`/sales`): Granular timeline grouping (Day, Week, Month, Quarter, Year) with interactive sales breakdowns.
  3. **India Geography** (`/geography`): State rankings across 20 Indian states, regional performance cards (North, South, East, West, Central, Northeast), and top metro/tier-2 city metrics.
  4. **Product Performance** (`/products`): Top-N SKU ranking toggles (by Revenue, Quantity, or Orders) and catalog sector shares.
  5. **Customer Analytics** (`/customers`): Customer lifetime value, repeat buyer retention rates, monthly acquisition trajectory, and privacy-anonymized top buyers table.
  6. **Customer Segmentation** (`/customers/segments`): K-Means algorithmic clusters ($k=4$, silhouette score = $0.3845$) and RFM quintile cohorts (*Champions*, *Loyal*, *At Risk*, etc.).
  7. **Seller Analytics** (`/sellers`): Top marketplace merchants, fulfillment volumes, and merchant geographic base.
  8. **Payment Analytics** (`/payments`): Checkout instrument distribution (Credit Card, UPI, Vouchers, Debit Card) and rupee transaction volumes.
  9. **Review & Satisfaction** (`/reviews`): 1–5 star rating distribution, category customer satisfaction rankings, and revenue-rating Pearson correlation ($r = -0.0055$).
  10. **Business Insights** (`/insights`): Dynamic data-driven observations generated live from active filters.
- **Global Filter Bar**: Unified multi-dimension filtering (Year, Month, State, Region, Category, Payment Method, Date Range) synchronized via URL query parameters.
- **Indian Financial Localization**: Indian rupee grouping (`₹1,25,000`), Lakhs (`₹12.4 L`), and Crores (`₹2.8 Cr`).
- **Cohesive BI Design System**: Consistent visual language, standardized chart color tokens, accessible tooltips, loading skeletons, and graceful error handling.

---

## 2. Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **Routing**: React Router v6
- **Architecture**: Modular services, hooks, and presentation components

---

## 3. Installation & Setup

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install
```

---

## 4. Environment Variables

Create or verify `.env` inside `frontend/`:
```bash
cp .env.example .env
```

Configuration in `frontend/.env`:
```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

---

## 5. Backend Requirement

The frontend expects the FastAPI backend to be running locally on port 8000:
```bash
# In project root:
python run.py api

# Verify backend health in browser or curl:
curl http://127.0.0.1:8000/api/health
```

---

## 6. Running the Frontend

### Development Server
```bash
npm run dev
```
The application will launch at: [http://localhost:5173](http://localhost:5173)

### Production Build
```bash
npm run build
```
Generates an optimized, type-checked production bundle in `dist/`.

---

## 7. Folder Architecture

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/
│   │   ├── common/         # Skeletons, EmptyState, ErrorState, RefreshButton
│   │   ├── dashboard/      # KPICard, ChartCard, InsightCard
│   │   ├── charts/         # RevenueChart, OrdersChart, CategoryChart, StateChart, PaymentChart, SegmentChart
│   │   ├── filters/        # GlobalFilters bar
│   │   ├── layout/         # Sidebar, Header, PageContainer
│   │   └── tables/         # Reusable DataTable with sorting, search, and pagination
│   ├── pages/              # 10 Analytics views + 404 handler
│   ├── services/           # Centralized API service (api.ts)
│   ├── hooks/              # useFilterParams hook for URL-synced filters
│   ├── types/              # TypeScript interfaces matching backend Pydantic models
│   ├── utils/              # Indian currency (L/Cr), numbers, and chart color tokens
│   ├── lib/                # Utility helpers (cn)
│   ├── App.tsx             # Root router and layout
│   ├── main.tsx            # DOM mounting
│   └── index.css           # Tailwind base styles and tooltips
├── .env
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```
