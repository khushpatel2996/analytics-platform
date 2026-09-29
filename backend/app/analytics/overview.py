from typing import Dict, Any
import pandas as pd
from backend.app.schemas.common import FilterParams
from backend.app.schemas.overview import OverviewKPIs, OverviewData
from backend.app.analytics.data_service import data_service

class OverviewAnalytics:
    @staticmethod
    def get_overview(params: FilterParams) -> OverviewData:
        df_orders = data_service.filter_orders(params)
        df_items = data_service.filter_items(params)

        if df_orders.empty:
            kpis = OverviewKPIs(
                total_revenue=0.0,
                total_orders=0,
                total_customers=0,
                total_products=0,
                total_sellers=0,
                total_quantity=0,
                average_order_value=0.0,
                average_order_items=0.0,
                average_review_score=0.0,
                cancellation_rate=0.0,
                delivery_rate=0.0
            )
            return OverviewData(kpis=kpis)

        total_orders = int(len(df_orders))
        total_revenue = round(float(df_orders["order_total_value"].sum()), 2)
        total_customers = int(df_orders["customer_unique_id"].nunique())
        
        # Product & seller counts from items table
        if not df_items.empty:
            total_products = int(df_items["product_id"].nunique())
            total_sellers = int(df_items["seller_id"].nunique())
            total_quantity = int(df_items["quantity"].sum())
        else:
            total_products = 0
            total_sellers = 0
            total_quantity = int(df_orders["total_items"].sum())

        aov = round(total_revenue / total_orders, 2) if total_orders > 0 else 0.0
        avg_items = round(float(df_orders["total_items"].mean()), 2) if total_orders > 0 else 0.0
        
        avg_review = round(float(df_orders["order_review_score"].dropna().mean()), 2) if "order_review_score" in df_orders.columns and not df_orders["order_review_score"].dropna().empty else 0.0

        # Status rates
        status_counts = df_orders["order_status"].value_counts()
        canceled_count = int(status_counts.get("canceled", 0))
        delivered_count = int(status_counts.get("delivered", 0))
        
        cancellation_rate = round((canceled_count / total_orders) * 100, 2) if total_orders > 0 else 0.0
        delivery_rate = round((delivered_count / total_orders) * 100, 2) if total_orders > 0 else 0.0

        kpis = OverviewKPIs(
            total_revenue=total_revenue,
            total_orders=total_orders,
            total_customers=total_customers,
            total_products=total_products,
            total_sellers=total_sellers,
            total_quantity=total_quantity,
            average_order_value=aov,
            average_order_items=avg_items,
            average_review_score=avg_review,
            cancellation_rate=cancellation_rate,
            delivery_rate=delivery_rate
        )

        # Previews
        top_cats = (
            df_orders.groupby("category")["order_total_value"]
            .sum()
            .reset_index()
            .sort_values(by="order_total_value", ascending=False)
            .head(5)
            .rename(columns={"order_total_value": "revenue"})
            .to_dict(orient="records")
        )

        top_states = (
            df_orders.groupby("customer_state")["order_total_value"]
            .sum()
            .reset_index()
            .sort_values(by="order_total_value", ascending=False)
            .head(5)
            .rename(columns={"customer_state": "state", "order_total_value": "revenue"})
            .to_dict(orient="records")
        )

        return OverviewData(
            kpis=kpis,
            top_categories_preview=top_cats,
            top_states_preview=top_states
        )
