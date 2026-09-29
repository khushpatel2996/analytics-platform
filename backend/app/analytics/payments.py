from typing import Dict, Any, List, Optional
import pandas as pd
from backend.app.schemas.common import FilterParams, ChartData, KeyValueMetric
from backend.app.analytics.data_service import data_service

class PaymentAnalytics:
    @staticmethod
    def get_summary(params: FilterParams) -> Dict[str, Any]:
        df = data_service.filter_orders(params)
        if df.empty:
            return {
                "distribution": [],
                "chart_data": {"labels": [], "values": []},
                "trend": {"labels": [], "values": []}
            }

        total_val = df["order_total_value"].sum()
        total_orders = len(df)

        grp = df.groupby("primary_payment_type").agg(
            revenue=("order_total_value", "sum"),
            count=("order_id", "nunique")
        ).reset_index().sort_values(by="revenue", ascending=False)

        items = []
        for _, row in grp.iterrows():
            rev = round(float(row["revenue"]), 2)
            cnt = int(row["count"])
            pct = round((rev / total_val * 100), 2) if total_val > 0 else 0.0
            items.append({
                "payment_type": str(row["primary_payment_type"]).replace("_", " ").title(),
                "revenue": rev,
                "order_count": cnt,
                "share_percentage": pct
            })

        chart_data = {
            "labels": [item["payment_type"] for item in items],
            "values": [item["revenue"] for item in items],
            "counts": [item["order_count"] for item in items]
        }

        # Trend over time by payment type
        trend_pivot = df.pivot_table(
            index="year_month",
            columns="primary_payment_type",
            values="order_total_value",
            aggfunc="sum",
            fill_value=0.0
        ).reset_index().sort_values(by="year_month")

        trend_data = {
            "periods": trend_pivot["year_month"].tolist() if "year_month" in trend_pivot else [],
            "series": {
                col: [round(float(v), 2) for v in trend_pivot[col].tolist()]
                for col in trend_pivot.columns if col != "year_month"
            }
        }

        return {
            "total_payment_value": round(float(total_val), 2),
            "total_transactions": total_orders,
            "distribution": items,
            "chart_data": chart_data,
            "trend": trend_data
        }
