from typing import Dict, Any, List, Optional
import pandas as pd
from backend.app.schemas.common import FilterParams, ChartData
from backend.app.schemas.geography import StateMetric, CityMetric, RegionMetric, GeographyData
from backend.app.analytics.data_service import data_service

class GeographyAnalytics:
    @staticmethod
    def get_state_analytics(params: FilterParams) -> GeographyData:
        df = data_service.filter_orders(params)
        if df.empty:
            return GeographyData(
                states=[],
                regions=[],
                chart_data=ChartData(labels=[], values=[])
            )

        total_rev = df["order_total_value"].sum()

        # State level aggregation
        state_grp = df.groupby(["customer_state", "customer_region"]).agg(
            revenue=("order_total_value", "sum"),
            orders=("order_id", "nunique"),
            customers=("customer_unique_id", "nunique")
        ).reset_index().sort_values(by="revenue", ascending=False)

        state_metrics = []
        for _, row in state_grp.iterrows():
            rev = round(float(row["revenue"]), 2)
            orders = int(row["orders"])
            custs = int(row["customers"])
            aov = round(rev / orders, 2) if orders > 0 else 0.0
            pct = round((rev / total_rev * 100), 2) if total_rev > 0 else 0.0
            state_metrics.append(
                StateMetric(
                    state=str(row["customer_state"]),
                    region=str(row["customer_region"]),
                    revenue=rev,
                    orders=orders,
                    customers=custs,
                    aov=aov,
                    percentage_of_total=pct
                )
            )

        # Region level aggregation
        region_grp = df.groupby("customer_region").agg(
            revenue=("order_total_value", "sum"),
            orders=("order_id", "nunique")
        ).reset_index().sort_values(by="revenue", ascending=False)

        region_metrics = []
        for _, row in region_grp.iterrows():
            rev = round(float(row["revenue"]), 2)
            orders = int(row["orders"])
            pct = round((rev / total_rev * 100), 2) if total_rev > 0 else 0.0
            region_metrics.append(
                RegionMetric(
                    region=str(row["customer_region"]),
                    revenue=rev,
                    orders=orders,
                    percentage_of_total=pct
                )
            )

        chart_data = ChartData(
            labels=[s.state for s in state_metrics],
            values=[s.revenue for s in state_metrics]
        )

        return GeographyData(
            states=state_metrics,
            regions=region_metrics,
            chart_data=chart_data
        )

    @staticmethod
    def get_city_analytics(params: FilterParams, limit: int = 20) -> List[CityMetric]:
        df = data_service.filter_orders(params)
        if df.empty:
            return []

        city_grp = df.groupby(["customer_city", "customer_state", "customer_region"]).agg(
            revenue=("order_total_value", "sum"),
            orders=("order_id", "nunique")
        ).reset_index().sort_values(by="revenue", ascending=False).head(limit)

        city_metrics = []
        for _, row in city_grp.iterrows():
            rev = round(float(row["revenue"]), 2)
            orders = int(row["orders"])
            aov = round(rev / orders, 2) if orders > 0 else 0.0
            city_metrics.append(
                CityMetric(
                    city=str(row["customer_city"]),
                    state=str(row["customer_state"]),
                    region=str(row["customer_region"]),
                    revenue=rev,
                    orders=orders,
                    aov=aov
                )
            )
        return city_metrics
