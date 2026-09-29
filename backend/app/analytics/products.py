from typing import Dict, Any, List, Optional
import pandas as pd
from backend.app.schemas.common import FilterParams, ChartData
from backend.app.schemas.products import ProductsData, ProductItem, CategoriesData, CategoryItem
from backend.app.analytics.data_service import data_service

class ProductAnalytics:
    @staticmethod
    def get_top_products(params: FilterParams, metric: str = "revenue", limit: int = 10) -> ProductsData:
        df = data_service.filter_items(params)
        if df.empty:
            return ProductsData(
                metric=metric,
                limit=limit,
                items=[],
                chart_data=ChartData(labels=[], values=[])
            )

        metric = metric.lower()
        sort_col = "revenue"
        if metric in ["quantity", "qty"]:
            sort_col = "quantity"
        elif metric in ["orders", "orders_count"]:
            sort_col = "orders_count"

        grouped = df.groupby(["product_id", "product_category_name"]).agg(
            revenue=("total_item_value", "sum"),
            quantity=("quantity", "sum"),
            orders_count=("order_id", "nunique"),
            average_price=("price", "mean")
        ).reset_index().sort_values(by=sort_col, ascending=False).head(limit)

        items = []
        for _, row in grouped.iterrows():
            items.append(
                ProductItem(
                    product_id=str(row["product_id"]),
                    category=str(row["product_category_name"]),
                    revenue=round(float(row["revenue"]), 2),
                    quantity=int(row["quantity"]),
                    orders_count=int(row["orders_count"]),
                    average_price=round(float(row["average_price"]), 2)
                )
            )

        chart_labels = [item.product_id[:8] + "..." for item in items]
        chart_values = [getattr(item, sort_col) for item in items]

        return ProductsData(
            metric=metric,
            limit=limit,
            items=items,
            chart_data=ChartData(labels=chart_labels, values=chart_values)
        )

    @staticmethod
    def get_categories(params: FilterParams, limit: int = 20) -> CategoriesData:
        df = data_service.filter_items(params)
        if df.empty:
            return CategoriesData(
                items=[],
                chart_data=ChartData(labels=[], values=[])
            )

        total_rev = df["total_item_value"].sum()
        grouped = df.groupby("product_category_name").agg(
            revenue=("total_item_value", "sum"),
            quantity=("quantity", "sum"),
            orders_count=("order_id", "nunique"),
            average_price=("price", "mean")
        ).reset_index().sort_values(by="revenue", ascending=False).head(limit)

        items = []
        for _, row in grouped.iterrows():
            rev = round(float(row["revenue"]), 2)
            pct = round((rev / total_rev * 100), 2) if total_rev > 0 else 0.0
            items.append(
                CategoryItem(
                    category=str(row["product_category_name"]),
                    revenue=rev,
                    quantity=int(row["quantity"]),
                    orders_count=int(row["orders_count"]),
                    average_price=round(float(row["average_price"]), 2),
                    percentage_of_revenue=pct
                )
            )

        return CategoriesData(
            items=items,
            chart_data=ChartData(
                labels=[c.category for c in items],
                values=[c.revenue for c in items]
            )
        )
