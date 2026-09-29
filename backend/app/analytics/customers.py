from typing import Dict, Any, List, Optional
import pandas as pd
from backend.app.schemas.common import FilterParams, ChartData
from backend.app.schemas.customers import CustomerSummaryData, CustomerSegmentsData, TopCustomerItem, ClusterMetric
from backend.app.analytics.data_service import data_service
from backend.app.ml.model_manager import ModelManager

class CustomerAnalytics:
    @staticmethod
    def get_summary(params: FilterParams) -> CustomerSummaryData:
        df = data_service.filter_orders(params)
        if df.empty:
            return CustomerSummaryData(
                total_customers=0,
                repeat_customers=0,
                repeat_customer_rate=0.0,
                average_spend_per_customer=0.0,
                acquisition_trend=ChartData(labels=[], values=[])
            )

        cust_orders = df.groupby("customer_unique_id").agg(
            order_count=("order_id", "nunique"),
            total_spend=("order_total_value", "sum"),
            first_order=("order_purchase_timestamp", "min")
        ).reset_index()

        total_cust = len(cust_orders)
        repeat_cust = int((cust_orders["order_count"] > 1).sum())
        repeat_rate = round((repeat_cust / total_cust) * 100, 2) if total_cust > 0 else 0.0
        avg_spend = round(float(cust_orders["total_spend"].mean()), 2) if total_cust > 0 else 0.0

        # Acquisition trend by month
        cust_orders["acquisition_month"] = cust_orders["first_order"].dt.strftime("%Y-%m")
        acq_grp = cust_orders.groupby("acquisition_month")["customer_unique_id"].count().reset_index().sort_values(by="acquisition_month")

        chart_data = ChartData(
            labels=acq_grp["acquisition_month"].tolist(),
            values=acq_grp["customer_unique_id"].tolist()
        )

        return CustomerSummaryData(
            total_customers=total_cust,
            repeat_customers=repeat_cust,
            repeat_customer_rate=repeat_rate,
            average_spend_per_customer=avg_spend,
            acquisition_trend=chart_data
        )

    @staticmethod
    def get_top_customers(params: FilterParams, limit: int = 10) -> List[TopCustomerItem]:
        df = data_service.filter_orders(params)
        if df.empty:
            return []

        cust_grp = df.groupby("customer_unique_id").agg(
            orders_count=("order_id", "nunique"),
            total_spend=("order_total_value", "sum"),
            state=("customer_state", "first"),
            city=("customer_city", "first")
        ).reset_index().sort_values(by="total_spend", ascending=False).head(limit)

        items = []
        for _, row in cust_grp.iterrows():
            cid = str(row["customer_unique_id"])
            # Anonymize customer ID: keep prefix and mask rest for privacy
            anon_id = cid[:6] + "..." + cid[-4:]
            items.append(
                TopCustomerItem(
                    customer_unique_id=anon_id,
                    orders_count=int(row["orders_count"]),
                    total_spend=round(float(row["total_spend"]), 2),
                    state=str(row["state"]),
                    city=str(row["city"])
                )
            )
        return items

    @staticmethod
    def get_segments() -> CustomerSegmentsData:
        manager = ModelManager()
        summary = manager.load_summary()

        if summary is None:
            # Fallback to in-memory dim_customers if loaded
            dim_c = data_service.dim_customers
            if not dim_c.empty and "cluster_id" in dim_c.columns:
                from backend.app.ml.clustering import KMeansClusterer
                clusterer = KMeansClusterer()
                summary = clusterer.profile_clusters(dim_c)
            else:
                return CustomerSegmentsData(
                    total_customers_segmented=0,
                    silhouette_score=0.0,
                    clusters=[],
                    rfm_segments=[]
                )

        cluster_metrics = [
            ClusterMetric(
                cluster_id=c["cluster_id"],
                segment_name=c["segment_name"],
                segment_size=c["segment_size"],
                percentage_of_customers=c["percentage_of_customers"],
                average_revenue=c["average_revenue"],
                average_frequency=c["average_frequency"],
                average_recency=c["average_recency"],
                total_revenue=c["total_revenue"]
            )
            for c in summary.get("clusters", [])
        ]

        # RFM Segment distribution if available
        rfm_segments_list = []
        if not data_service.dim_customers.empty and "rfm_segment" in data_service.dim_customers.columns:
            rfm_counts = data_service.dim_customers["rfm_segment"].value_counts().reset_index()
            rfm_counts.columns = ["segment", "count"]
            tot = len(data_service.dim_customers)
            for _, r in rfm_counts.iterrows():
                rfm_segments_list.append({
                    "segment": str(r["segment"]),
                    "count": int(r["count"]),
                    "percentage": round((int(r["count"]) / tot) * 100, 2)
                })

        return CustomerSegmentsData(
            total_customers_segmented=summary.get("total_customers", 0),
            silhouette_score=summary.get("silhouette_score", 0.0),
            clusters=cluster_metrics,
            rfm_segments=rfm_segments_list
        )
