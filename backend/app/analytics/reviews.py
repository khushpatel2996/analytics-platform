from typing import Dict, Any, List, Optional
import pandas as pd
from backend.app.schemas.common import FilterParams, ChartData
from backend.app.analytics.data_service import data_service

class ReviewAnalytics:
    @staticmethod
    def get_summary(params: FilterParams) -> Dict[str, Any]:
        df = data_service.filter_orders(params).copy()
        if df.empty or "order_review_score" not in df.columns:
            return {
                "average_rating": 0.0,
                "total_reviews": 0,
                "rating_distribution": [],
                "chart_data": {"labels": [], "values": []},
                "by_category": [],
                "by_state": [],
                "correlation_with_revenue": 0.0
            }

        valid_reviews = df.dropna(subset=["order_review_score"]).copy()
        if valid_reviews.empty:
            return {
                "average_rating": 0.0,
                "total_reviews": 0,
                "rating_distribution": [],
                "chart_data": {"labels": [], "values": []},
                "by_category": [],
                "by_state": [],
                "correlation_with_revenue": 0.0
            }

        valid_reviews["review_rounded"] = valid_reviews["order_review_score"].round().astype(int)
        total_revs = len(valid_reviews)
        avg_rating = round(float(valid_reviews["order_review_score"].mean()), 2)

        # 1-5 Star Rating Distribution
        rating_counts = valid_reviews["review_rounded"].value_counts().to_dict()
        distribution = []
        for star in [5, 4, 3, 2, 1]:
            cnt = int(rating_counts.get(star, 0))
            pct = round((cnt / total_revs * 100), 2) if total_revs > 0 else 0.0
            distribution.append({
                "stars": star,
                "count": cnt,
                "percentage": pct
            })

        chart_data = {
            "labels": [f"{d['stars']} Stars" for d in distribution],
            "values": [d["count"] for d in distribution]
        }

        # Rating by top categories
        cat_grp = valid_reviews.groupby("category").agg(
            avg_rating=("order_review_score", "mean"),
            reviews_count=("order_id", "nunique"),
            total_revenue=("order_total_value", "sum")
        ).reset_index().sort_values(by="reviews_count", ascending=False).head(10)

        by_cat = [
            {
                "category": str(r["category"]),
                "average_rating": round(float(r["avg_rating"]), 2),
                "reviews_count": int(r["reviews_count"]),
                "revenue": round(float(r["total_revenue"]), 2)
            }
            for _, r in cat_grp.iterrows()
        ]

        # Rating by top states
        state_grp = valid_reviews.groupby("customer_state").agg(
            avg_rating=("order_review_score", "mean"),
            reviews_count=("order_id", "nunique")
        ).reset_index().sort_values(by="reviews_count", ascending=False).head(10)

        by_state = [
            {
                "state": str(r["customer_state"]),
                "average_rating": round(float(r["avg_rating"]), 2),
                "reviews_count": int(r["reviews_count"])
            }
            for _, r in state_grp.iterrows()
        ]

        # Correlation between review rating and order revenue
        corr = float(valid_reviews["order_review_score"].corr(valid_reviews["order_total_value"]))
        corr = round(corr, 4) if not pd.isna(corr) else 0.0

        return {
            "average_rating": avg_rating,
            "total_reviews": total_revs,
            "rating_distribution": distribution,
            "chart_data": chart_data,
            "by_category": by_cat,
            "by_state": by_state,
            "correlation_with_revenue": corr
        }
