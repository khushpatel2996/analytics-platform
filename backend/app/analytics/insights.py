from typing import Dict, Any, List, Optional
import pandas as pd
from backend.app.schemas.common import FilterParams
from backend.app.analytics.data_service import data_service

class InsightsEngine:
    """
    Dynamically generates verifiable, business observations from filtered data.
    Never fabricates metrics; all values are computed directly from active records.
    """
    @staticmethod
    def generate_insights(params: FilterParams) -> List[Dict[str, Any]]:
        df_orders = data_service.filter_orders(params)
        df_items = data_service.filter_items(params)
        insights = []

        if df_orders.empty:
            return [{
                "type": "info",
                "title": "No Data Found",
                "description": "No orders matched the selected filter criteria.",
                "metric": "Orders",
                "value": 0
            }]

        total_rev = float(df_orders["order_total_value"].sum())
        total_orders = len(df_orders)

        # 1. Top Category Revenue Dominance
        cat_grp = df_orders.groupby("category")["order_total_value"].sum().sort_values(ascending=False)
        if not cat_grp.empty and total_rev > 0:
            top_cat = cat_grp.index[0]
            top_cat_rev = float(cat_grp.iloc[0])
            top_cat_pct = round((top_cat_rev / total_rev) * 100, 1)
            insights.append({
                "type": "category",
                "title": f"{top_cat} Leads Category Revenue",
                "description": f"The '{top_cat}' category generated ₹{top_cat_rev:,.2f}, contributing {top_cat_pct}% of total sales.",
                "metric": "Category Revenue Share",
                "value": top_cat_pct
            })

        # 2. Regional Sales Concentration
        region_grp = df_orders.groupby("customer_region")["order_total_value"].sum().sort_values(ascending=False)
        if not region_grp.empty and total_rev > 0:
            top_reg = region_grp.index[0]
            top_reg_rev = float(region_grp.iloc[0])
            top_reg_pct = round((top_reg_rev / total_rev) * 100, 1)
            insights.append({
                "type": "geography",
                "title": f"{top_reg} India Drives Market Demand",
                "description": f"Customers in the {top_reg} region contributed {top_reg_pct}% (₹{top_reg_rev:,.2f}) of total order value.",
                "metric": "Regional Share",
                "value": top_reg_pct
            })

        # 3. Top State Contribution
        state_grp = df_orders.groupby("customer_state")["order_total_value"].sum().sort_values(ascending=False)
        if not state_grp.empty and total_rev > 0:
            top_state = state_grp.index[0]
            top_state_rev = float(state_grp.iloc[0])
            top_state_pct = round((top_state_rev / total_rev) * 100, 1)
            insights.append({
                "type": "state",
                "title": f"{top_state} is Top State by Volume",
                "description": f"{top_state} generated ₹{top_state_rev:,.2f} across the selected period, representing {top_state_pct}% of state revenue.",
                "metric": "State Share",
                "value": top_state_pct
            })

        # 4. Payment Method Adoption
        pay_grp = df_orders["primary_payment_type"].value_counts()
        if not pay_grp.empty:
            top_pay = str(pay_grp.index[0]).replace("_", " ").title()
            top_pay_cnt = int(pay_grp.iloc[0])
            top_pay_pct = round((top_pay_cnt / total_orders) * 100, 1)
            insights.append({
                "type": "payment",
                "title": f"{top_pay} Dominates Checkout",
                "description": f"{top_pay} accounted for {top_pay_pct}% ({top_pay_cnt:,} orders) of all processed transactions.",
                "metric": "Payment Method Share",
                "value": top_pay_pct
            })

        # 5. Top 10 Product Concentration (Pareto analysis)
        if not df_items.empty and total_rev > 0:
            top_prod_grp = df_items.groupby("product_id")["total_item_value"].sum().sort_values(ascending=False).head(10)
            top_10_rev = float(top_prod_grp.sum())
            top_10_pct = round((top_10_rev / total_rev) * 100, 1)
            insights.append({
                "type": "product_concentration",
                "title": "Top 10 Products Revenue Contribution",
                "description": f"The top 10 best-selling products generated ₹{top_10_rev:,.2f}, representing {top_10_pct}% of overall product turnover.",
                "metric": "Top 10 Product Share",
                "value": top_10_pct
            })

        # 6. Month-over-Month Growth (Latest two full months in selection)
        monthly_rev = df_orders.groupby("year_month")["order_total_value"].sum().sort_index()
        if len(monthly_rev) >= 2:
            prev_m = float(monthly_rev.iloc[-2])
            curr_m = float(monthly_rev.iloc[-1])
            if prev_m > 0:
                growth_rate = round(((curr_m - prev_m) / prev_m) * 100, 1)
                trend_dir = "increased" if growth_rate >= 0 else "decreased"
                insights.append({
                    "type": "growth",
                    "title": f"Recent Monthly Trajectory ({monthly_rev.index[-1]})",
                    "description": f"Revenue {trend_dir} by {abs(growth_rate)}% from {monthly_rev.index[-2]} (₹{prev_m:,.2f}) to {monthly_rev.index[-1]} (₹{curr_m:,.2f}).",
                    "metric": "MoM Growth",
                    "value": growth_rate
                })

        # 7. Customer Satisfaction & High-Rating Ratio
        if "order_review_score" in df_orders.columns:
            rev_scores = df_orders["order_review_score"].dropna()
            if not rev_scores.empty:
                high_ratings = (rev_scores >= 4).sum()
                high_pct = round((high_ratings / len(rev_scores)) * 100, 1)
                insights.append({
                    "type": "satisfaction",
                    "title": "High Customer Satisfaction",
                    "description": f"{high_pct}% of customer reviews awarded positive 4 or 5-star ratings, indicating strong buyer satisfaction.",
                    "metric": "Positive Review Rate",
                    "value": high_pct
                })

        return insights
