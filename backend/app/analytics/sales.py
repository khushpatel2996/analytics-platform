from typing import Dict, Any, List, Optional
import pandas as pd
from backend.app.schemas.common import FilterParams, ChartData, KeyValueMetric
from backend.app.schemas.sales import SalesTrendData, TrendItem, SalesBreakdownData
from backend.app.analytics.data_service import data_service

class SalesAnalytics:
    @staticmethod
    def get_trend(params: FilterParams, granularity: str = "month") -> SalesTrendData:
        df = data_service.filter_orders(params).copy()
        if df.empty:
            return SalesTrendData(
                granularity=granularity,
                trend=[],
                chart_data=ChartData(labels=[], values=[])
            )

        # Determine period key
        granularity = granularity.lower()
        if granularity == "day":
            df["period"] = df["date_only"]
        elif granularity == "week":
            df["period"] = df["year"].astype(str) + "-W" + df["week"].astype(str).str.zfill(2)
        elif granularity == "quarter":
            df["period"] = df["year"].astype(str) + "-Q" + df["quarter"].astype(str)
        elif granularity == "year":
            df["period"] = df["year"].astype(str)
        else: # default month
            granularity = "month"
            df["period"] = df["year_month"]

        # Aggregate
        grouped = df.groupby("period").agg(
            revenue=("order_total_value", "sum"),
            orders=("order_id", "nunique"),
            quantity=("total_items", "sum")
        ).reset_index().sort_values(by="period")

        grouped["revenue"] = grouped["revenue"].round(2)
        grouped["aov"] = (grouped["revenue"] / grouped["orders"]).round(2)

        items = [
            TrendItem(
                period=str(row["period"]),
                revenue=float(row["revenue"]),
                orders=int(row["orders"]),
                quantity=int(row["quantity"]),
                aov=float(row["aov"])
            )
            for _, row in grouped.iterrows()
        ]

        chart_data = ChartData(
            labels=[item.period for item in items],
            values=[item.revenue for item in items],
            extra={
                "orders": [item.orders for item in items],
                "aov": [item.aov for item in items]
            }
        )

        return SalesTrendData(
            granularity=granularity,
            trend=items,
            chart_data=chart_data
        )

    @staticmethod
    def get_breakdown(params: FilterParams, dimension: str = "category", limit: int = 15) -> SalesBreakdownData:
        dim = dimension.lower()
        if dim in ["product", "product_id"]:
            df = data_service.filter_items(params)
            group_col = "product_id"
        elif dim in ["category", "subcategory"]:
            df = data_service.filter_orders(params)
            group_col = "category"
        elif dim == "state":
            df = data_service.filter_orders(params)
            group_col = "customer_state"
        elif dim == "city":
            df = data_service.filter_orders(params)
            group_col = "customer_city"
        elif dim == "payment":
            df = data_service.filter_orders(params)
            group_col = "primary_payment_type"
        else:
            df = data_service.filter_orders(params)
            group_col = "category"

        if df.empty:
            return SalesBreakdownData(
                dimension=dimension,
                items=[],
                chart_data=ChartData(labels=[], values=[])
            )

        value_col = "total_item_value" if group_col == "product_id" else "order_total_value"
        grouped = df.groupby(group_col).agg(
            revenue=(value_col, "sum"),
            count=("order_id", "nunique")
        ).reset_index().sort_values(by="revenue", ascending=False).head(limit)

        total_rev = df[value_col].sum()
        items = []
        for _, row in grouped.iterrows():
            rev = round(float(row["revenue"]), 2)
            pct = round((rev / total_rev * 100), 2) if total_rev > 0 else 0.0
            items.append(
                KeyValueMetric(
                    label=str(row[group_col]),
                    value=rev,
                    count=int(row["count"]),
                    percentage=pct
                )
            )

        chart_data = ChartData(
            labels=[item.label for item in items],
            values=[item.value for item in items]
        )

        return SalesBreakdownData(
            dimension=dimension,
            items=items,
            chart_data=chart_data
        )
