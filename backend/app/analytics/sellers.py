from typing import Dict, Any, List, Optional
import pandas as pd
from backend.app.schemas.common import FilterParams, ChartData
from backend.app.analytics.data_service import data_service

class SellerAnalytics:
    @staticmethod
    def get_top_sellers(params: FilterParams, limit: int = 10) -> Dict[str, Any]:
        df = data_service.filter_items(params)
        if df.empty:
            return {"total_sellers": 0, "sellers": [], "chart_data": {"labels": [], "values": []}}

        total_sellers = int(df["seller_id"].nunique())

        grp = df.groupby(["seller_id", "seller_city", "seller_state"]).agg(
            revenue=("total_item_value", "sum"),
            orders_count=("order_id", "nunique"),
            items_sold=("quantity", "sum")
        ).reset_index().sort_values(by="revenue", ascending=False).head(limit)

        sellers = []
        for _, row in grp.iterrows():
            sid = str(row["seller_id"])
            anon_sid = sid[:6] + "..." + sid[-4:]
            sellers.append({
                "seller_id": anon_sid,
                "city": str(row["seller_city"]),
                "state": str(row["seller_state"]),
                "revenue": round(float(row["revenue"]), 2),
                "orders_count": int(row["orders_count"]),
                "items_sold": int(row["items_sold"])
            })

        chart_data = {
            "labels": [s["seller_id"] for s in sellers],
            "values": [s["revenue"] for s in sellers]
        }

        return {
            "total_sellers": total_sellers,
            "sellers": sellers,
            "chart_data": chart_data
        }

    @staticmethod
    def get_seller_geography(params: FilterParams) -> Dict[str, Any]:
        df = data_service.filter_items(params)
        if df.empty:
            return {"by_state": [], "by_region": []}

        state_grp = df.groupby("seller_state").agg(
            seller_count=("seller_id", "nunique"),
            revenue=("total_item_value", "sum")
        ).reset_index().sort_values(by="seller_count", ascending=False)

        region_grp = df.groupby("seller_region").agg(
            seller_count=("seller_id", "nunique"),
            revenue=("total_item_value", "sum")
        ).reset_index().sort_values(by="seller_count", ascending=False)

        return {
            "by_state": [
                {
                    "state": str(r["seller_state"]),
                    "seller_count": int(r["seller_count"]),
                    "revenue": round(float(r["revenue"]), 2)
                }
                for _, r in state_grp.iterrows()
            ],
            "by_region": [
                {
                    "region": str(r["seller_region"]),
                    "seller_count": int(r["seller_count"]),
                    "revenue": round(float(r["revenue"]), 2)
                }
                for _, r in region_grp.iterrows()
            ]
        }
