import math
import re
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from backend.app.schemas.intelligence import (
    CategoryShare,
    ColumnFilterOption,
    ColumnQualityItem,
    CorrelationPair,
    CorrelationsAnalytics,
    DataQualityAnalytics,
    DatasetAnalytics,
    DatasetCapabilities,
    DetectedColumn,
    DistributionDimension,
    DistributionsAnalytics,
    DynamicKPI,
    EntityRanking,
    FilterOptionItem,
    GeographicPoint,
    GeographyAnalytics,
    GeographyDimension,
    MetricStatistics,
    MetricSummary,
    OutlierFeatureSummary,
    OutlierInspectionRecord,
    OutlierMetric,
    OutlierOverview,
    OutliersAnalytics,
    OverviewAnalytics,
    RankingItem,
    RankingsAnalytics,
    SegmentData,
    SegmentMetricStats,
    MetricComparisonDetail,
    SegmentComparisonResponse,
    TimeSeriesPoint,
    TrendsAnalytics,
)
from backend.app.schemas.upload import DatasetProfileResponse


class StatisticalCalculator:
    """
    Computes real, mathematically sound statistical aggregations and analytics
    from an uploaded dataset DataFrame.
    Guarantees 100% JSON safety (no NaNs, no Infinities, pure Python scalars).
    """

    @staticmethod
    def safe_float(val: Any, precision: int = 2) -> Optional[float]:
        """Convert any numeric scalar to a safe, rounded Python float or None."""
        if val is None:
            return None
        try:
            f = float(val)
            if math.isnan(f) or math.isinf(f):
                return None
            return round(f, precision)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def safe_int(val: Any) -> int:
        """Convert scalar to safe Python int."""
        if val is None:
            return 0
        try:
            f = float(val)
            if math.isnan(f) or math.isinf(f):
                return 0
            return int(f)
        except (ValueError, TypeError):
            return 0

    @staticmethod
    def format_title(col_name: str) -> str:
        """Format a column name into Title Case display label."""
        if not col_name:
            return ""
        s = re.sub(r'([a-z0-9])([A-Z])', r'\1 \2', col_name)
        tokens = re.split(r'[_ \-\./]+', s.strip())
        return " ".join(t.capitalize() for t in tokens if t)

    @classmethod
    def compute_metric_stats(cls, s: pd.Series) -> MetricStatistics:
        """Calculates 10-point statistical distribution for a numeric series."""
        s_clean = pd.to_numeric(s, errors="coerce").dropna()
        if s_clean.empty:
            return MetricStatistics(count=0)

        cnt = len(s_clean)
        tot = cls.safe_float(s_clean.sum())
        avg = cls.safe_float(s_clean.mean())
        med = cls.safe_float(s_clean.median())
        min_v = cls.safe_float(s_clean.min())
        max_v = cls.safe_float(s_clean.max())
        std_v = cls.safe_float(s_clean.std()) if cnt > 1 else 0.0

        q25 = cls.safe_float(s_clean.quantile(0.25))
        q75 = cls.safe_float(s_clean.quantile(0.75))
        iqr = cls.safe_float((q75 - q25) if (q75 is not None and q25 is not None) else 0.0)

        return MetricStatistics(
            count=cnt,
            total=tot,
            average=avg,
            median=med,
            min=min_v,
            max=max_v,
            std_dev=std_v,
            q25=q25,
            q75=q75,
            iqr=iqr,
        )

    @classmethod
    def find_key_metrics(
        cls,
        df: pd.DataFrame,
        detected_columns: List[DetectedColumn],
    ) -> Tuple[Optional[MetricSummary], Optional[MetricSummary]]:
        """
        Identifies value_metric (monetary) and primary_metric (score, monetary, or continuous measure).
        """
        col_lookup = {dc.name: dc for dc in detected_columns}
        numeric_cols = [
            dc for dc in detected_columns
            if dc.type == "numeric" and not dc.is_identifier and dc.name in df.columns
        ]

        value_col: Optional[DetectedColumn] = None
        # 1. Check for monetary_value
        monetary_candidates = [dc for dc in numeric_cols if dc.semantic_role == "monetary_value"]
        if monetary_candidates:
            # Pick the candidate with highest non-zero sum or first
            best_col = monetary_candidates[0]
            best_sum = -1.0
            for cand in monetary_candidates:
                s_num = pd.to_numeric(df[cand.name], errors="coerce").dropna()
                curr_sum = s_num.sum() if not s_num.empty else 0
                if curr_sum > best_sum:
                    best_sum = curr_sum
                    best_col = cand
            value_col = best_col

        # 2. Check for primary metric
        primary_col: Optional[DetectedColumn] = None
        if value_col:
            primary_col = value_col
        else:
            # Try score
            score_candidates = [dc for dc in numeric_cols if dc.semantic_role == "score"]
            if score_candidates:
                primary_col = score_candidates[0]
            else:
                # Try quantity
                qty_candidates = [dc for dc in numeric_cols if dc.semantic_role == "quantity"]
                if qty_candidates:
                    primary_col = qty_candidates[0]
                elif numeric_cols:
                    # Pick the numeric column with highest variance
                    best_var = -1.0
                    for nc in numeric_cols:
                        s_num = pd.to_numeric(df[nc.name], errors="coerce").dropna()
                        curr_var = s_num.var() if len(s_num) > 1 else 0
                        if curr_var > best_var:
                            best_var = curr_var
                            primary_col = nc

        value_summary: Optional[MetricSummary] = None
        if value_col:
            stats = cls.compute_metric_stats(df[value_col.name])
            value_summary = MetricSummary(
                available=True,
                column=value_col.name,
                label=cls.format_title(value_col.name),
                semantic_role=value_col.semantic_role,
                statistics=stats,
            )

        primary_summary: Optional[MetricSummary] = None
        if primary_col:
            if value_col and primary_col.name == value_col.name:
                primary_summary = value_summary
            else:
                stats = cls.compute_metric_stats(df[primary_col.name])
                primary_summary = MetricSummary(
                    available=True,
                    column=primary_col.name,
                    label=cls.format_title(primary_col.name),
                    semantic_role=primary_col.semantic_role,
                    statistics=stats,
                )

        return value_summary, primary_summary

    @classmethod
    def compute_trends(
        cls,
        df: pd.DataFrame,
        detected_columns: List[DetectedColumn],
        capabilities: DatasetCapabilities,
        primary_metric: Optional[MetricSummary],
    ) -> TrendsAnalytics:
        """Computes chronological trends aggregating by month, week, or day."""
        if not capabilities.time_series:
            return TrendsAnalytics(available=False)

        # Locate date column
        date_col_name: Optional[str] = None
        for dc in detected_columns:
            if dc.semantic_role == "date" and dc.name in df.columns:
                date_col_name = dc.name
                break
        if not date_col_name:
            for dc in detected_columns:
                if dc.type == "datetime" and dc.name in df.columns:
                    date_col_name = dc.name
                    break

        if not date_col_name:
            return TrendsAnalytics(available=False)

        try:
            dt_s = pd.to_datetime(df[date_col_name], errors="coerce")
            valid_mask = dt_s.notna()
            valid_count = valid_mask.sum()
            if valid_count < 2:
                return TrendsAnalytics(available=False)

            dt_valid = dt_s[valid_mask]
            min_date = dt_valid.min()
            max_date = dt_valid.max()
            span_days = (max_date - min_date).days

            # Determine granularity
            if span_days > 60:
                fmt = "%Y-%m"
                granularity = "monthly"
            elif span_days >= 14:
                fmt = "%Y-%m-%d"
                granularity = "daily"
            else:
                fmt = "%Y-%m-%d"
                granularity = "daily"

            period_s = dt_valid.dt.strftime(fmt)
            metric_col = primary_metric.column if (primary_metric and primary_metric.column in df.columns) else None

            sub_df = df.loc[valid_mask].copy()
            sub_df["_period"] = period_s

            if metric_col:
                sub_df["_metric"] = pd.to_numeric(sub_df[metric_col], errors="coerce").fillna(0)
                grouped = sub_df.groupby("_period").agg(
                    value=("_metric", "sum"),
                    count=("_period", "count"),
                ).reset_index()
            else:
                grouped = sub_df.groupby("_period").size().reset_index(name="count")
                grouped["value"] = grouped["count"]

            grouped = grouped.sort_values("_period")

            points: List[TimeSeriesPoint] = []
            peak_period: Optional[str] = None
            peak_val = -float("inf")

            for _, row in grouped.iterrows():
                p = str(row["_period"])
                v = cls.safe_float(row["value"]) or 0.0
                c = cls.safe_int(row["count"])
                points.append(TimeSeriesPoint(period=p, value=v, count=c))
                if v > peak_val:
                    peak_val = v
                    peak_period = p

            return TrendsAnalytics(
                available=True,
                date_column=date_col_name,
                metric_column=metric_col,
                metric_label=cls.format_title(metric_col) if metric_col else "Count",
                granularity=granularity,
                data=points,
                total_periods=len(points),
                start_period=points[0].period if points else None,
                end_period=points[-1].period if points else None,
                peak_period=peak_period,
                peak_value=cls.safe_float(peak_val) if peak_val != -float("inf") else None,
            )
        except Exception:
            return TrendsAnalytics(available=False)

    @classmethod
    def compute_distributions(
        cls,
        df: pd.DataFrame,
        detected_columns: List[DetectedColumn],
        primary_metric: Optional[MetricSummary],
    ) -> DistributionsAnalytics:
        """Computes categorical frequency distributions and metric breakdowns."""
        total_rows = len(df)
        if total_rows == 0:
            return DistributionsAnalytics(available=False)

        cat_cols: List[DetectedColumn] = []
        for dc in detected_columns:
            if dc.is_identifier or dc.name not in df.columns:
                continue
            if dc.semantic_role in ["category", "department", "payment_method", "status", "product"] or dc.type == "categorical":
                cat_cols.append(dc)

        if not cat_cols:
            return DistributionsAnalytics(available=False)

        metric_col = primary_metric.column if (primary_metric and primary_metric.column in df.columns) else None
        num_s = pd.to_numeric(df[metric_col], errors="coerce").fillna(0) if metric_col else None

        dimensions: List[DistributionDimension] = []
        # Take up to 4 key dimensions
        for col_def in cat_cols[:4]:
            col_name = col_def.name
            s = df[col_name].dropna().astype(str).str.strip()
            if s.empty:
                continue

            unique_cnt = s.nunique()
            if unique_cnt < 2:
                continue

            val_counts = s.value_counts()
            top_10 = val_counts.head(10)
            other_cnt = val_counts.iloc[10:].sum() if len(val_counts) > 10 else 0

            cat_shares: List[CategoryShare] = []
            for cat_name, cnt in top_10.items():
                pct = cls.safe_float((cnt / total_rows) * 100) or 0.0
                tot_m: Optional[float] = None
                avg_m: Optional[float] = None
                if num_s is not None:
                    cat_mask = (df[col_name].astype(str).str.strip() == cat_name)
                    cat_vals = num_s[cat_mask]
                    if not cat_vals.empty:
                        tot_m = cls.safe_float(cat_vals.sum())
                        avg_m = cls.safe_float(cat_vals.mean())

                cat_shares.append(
                    CategoryShare(
                        category=str(cat_name),
                        count=int(cnt),
                        percentage=pct,
                        total_metric=tot_m,
                        average_metric=avg_m,
                    )
                )

            if other_cnt > 0:
                other_pct = cls.safe_float((other_cnt / total_rows) * 100) or 0.0
                other_tot: Optional[float] = None
                other_avg: Optional[float] = None
                if num_s is not None:
                    top_names = set(top_10.index)
                    other_mask = (~df[col_name].astype(str).str.strip().isin(top_names)) & (df[col_name].notna())
                    other_vals = num_s[other_mask]
                    if not other_vals.empty:
                        other_tot = cls.safe_float(other_vals.sum())
                        other_avg = cls.safe_float(other_vals.mean())

                cat_shares.append(
                    CategoryShare(
                        category="Other",
                        count=int(other_cnt),
                        percentage=other_pct,
                        total_metric=other_tot,
                        average_metric=other_avg,
                    )
                )

            dimensions.append(
                DistributionDimension(
                    column=col_name,
                    label=cls.format_title(col_name),
                    unique_count=unique_cnt,
                    categories=cat_shares,
                )
            )

        return DistributionsAnalytics(
            available=len(dimensions) > 0,
            dimensions=dimensions,
        )

    @classmethod
    def compute_rankings(
        cls,
        df: pd.DataFrame,
        detected_columns: List[DetectedColumn],
        primary_metric: Optional[MetricSummary],
    ) -> RankingsAnalytics:
        """Computes top entity rankings aggregated by primary quantitative metric."""
        if not primary_metric or primary_metric.column not in df.columns:
            return RankingsAnalytics(available=False)

        metric_col = primary_metric.column
        metric_s = pd.to_numeric(df[metric_col], errors="coerce").fillna(0)
        overall_metric_sum = metric_s.sum()

        entity_roles = ["product", "customer", "student", "employee", "department", "category"]
        candidate_cols: List[DetectedColumn] = []

        for role in entity_roles:
            for dc in detected_columns:
                if dc.semantic_role == role and dc.name in df.columns:
                    candidate_cols.append(dc)

        # Fallback to categorical columns if no entity role matched
        if not candidate_cols:
            for dc in detected_columns:
                if dc.type == "categorical" and not dc.is_identifier and dc.name in df.columns:
                    candidate_cols.append(dc)

        if not candidate_cols:
            return RankingsAnalytics(available=False)

        rankings: List[EntityRanking] = []
        # Process up to 3 candidate entities
        for ent_col in candidate_cols[:3]:
            col_name = ent_col.name
            non_null = df[df[col_name].notna()]
            if non_null.empty:
                continue

            grouped = non_null.groupby(col_name)[metric_col].sum().sort_values(ascending=False).head(10)
            items: List[RankingItem] = []
            for rank, (name, val) in enumerate(grouped.items(), start=1):
                val_float = cls.safe_float(val) or 0.0
                pct = cls.safe_float((val_float / overall_metric_sum) * 100) if overall_metric_sum > 0 else None
                items.append(
                    RankingItem(
                        rank=rank,
                        name=str(name),
                        value=val_float,
                        percentage=pct,
                    )
                )

            if items:
                rankings.append(
                    EntityRanking(
                        entity_column=col_name,
                        label=cls.format_title(col_name),
                        metric_column=metric_col,
                        metric_label=primary_metric.label,
                        items=items,
                    )
                )

        return RankingsAnalytics(
            available=len(rankings) > 0,
            rankings=rankings,
        )

    @classmethod
    def compute_correlations(
        cls,
        df: pd.DataFrame,
        detected_columns: List[DetectedColumn],
    ) -> CorrelationsAnalytics:
        """Calculates Pearson correlation matrix across non-identifier numeric features."""
        numeric_cols = [
            dc.name for dc in detected_columns
            if dc.type == "numeric" and not dc.is_identifier and dc.name in df.columns
        ]

        valid_cols: List[str] = []
        for col in numeric_cols:
            s_num = pd.to_numeric(df[col], errors="coerce").dropna()
            if len(s_num) >= 2 and s_num.std() > 0:
                valid_cols.append(col)

        if len(valid_cols) < 2:
            return CorrelationsAnalytics(available=False)

        # Limit to top 8 columns to keep matrix clean and readable
        selected_cols = valid_cols[:8]
        corr_matrix = df[selected_cols].corr(method="pearson")

        matrix_dict: Dict[str, Dict[str, Optional[float]]] = {}
        strongest_pos: Optional[Tuple[str, str, float]] = None
        strongest_neg: Optional[Tuple[str, str, float]] = None

        for c1 in selected_cols:
            matrix_dict[c1] = {}
            for c2 in selected_cols:
                val = corr_matrix.loc[c1, c2]
                safe_v = cls.safe_float(val, precision=3)
                matrix_dict[c1][c2] = safe_v

                if c1 != c2 and safe_v is not None:
                    # Look for strongest positive (< 0.9999 to avoid self)
                    if safe_v < 0.9999 and (strongest_pos is None or safe_v > strongest_pos[2]):
                        strongest_pos = (c1, c2, safe_v)
                    # Look for strongest negative
                    if strongest_neg is None or safe_v < strongest_neg[2]:
                        strongest_neg = (c1, c2, safe_v)

        return CorrelationsAnalytics(
            available=True,
            columns=selected_cols,
            matrix=matrix_dict,
            strongest_positive=(
                CorrelationPair(col1=strongest_pos[0], col2=strongest_pos[1], correlation=strongest_pos[2])
                if strongest_pos else None
            ),
            strongest_negative=(
                CorrelationPair(col1=strongest_neg[0], col2=strongest_neg[1], correlation=strongest_neg[2])
                if strongest_neg else None
            ),
        )

    @classmethod
    def compute_outliers(
        cls,
        df: pd.DataFrame,
        detected_columns: List[DetectedColumn],
    ) -> OutliersAnalytics:
        """Detects extreme numerical anomalies using the standard 1.5x IQR rule."""
        numeric_cols = [
            dc.name for dc in detected_columns
            if dc.type == "numeric" and not dc.is_identifier and dc.name in df.columns
        ]

        results: List[OutlierMetric] = []
        for col in numeric_cols[:6]:
            s_num = pd.to_numeric(df[col], errors="coerce").dropna()
            if len(s_num) < 5:
                continue

            q1 = float(s_num.quantile(0.25))
            q3 = float(s_num.quantile(0.75))
            iqr = q3 - q1

            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr

            outliers = s_num[(s_num < lower_bound) | (s_num > upper_bound)]
            outlier_cnt = len(outliers)
            outlier_pct = (outlier_cnt / len(s_num)) * 100

            results.append(
                OutlierMetric(
                    column=col,
                    label=cls.format_title(col),
                    total_count=len(s_num),
                    outlier_count=outlier_cnt,
                    outlier_percentage=cls.safe_float(outlier_pct) or 0.0,
                    q1=cls.safe_float(q1) or 0.0,
                    q3=cls.safe_float(q3) or 0.0,
                    iqr=cls.safe_float(iqr) or 0.0,
                    lower_bound=cls.safe_float(lower_bound) or 0.0,
                    upper_bound=cls.safe_float(upper_bound) or 0.0,
                    min_outlier=cls.safe_float(outliers.min()) if outlier_cnt > 0 else None,
                    max_outlier=cls.safe_float(outliers.max()) if outlier_cnt > 0 else None,
                )
            )

        total_anomalies = sum(r.outlier_count for r in results)
        affected_features = sum(1 for r in results if r.outlier_count > 0)
        max_rate = max((r.outlier_percentage for r in results), default=0.0)
        most_affected = max(results, key=lambda r: r.outlier_percentage).label if results else None

        # Reliably compute affected_records across all evaluated numeric cols
        affected_records = 0
        if len(df) > 0 and affected_features > 0:
            combined_mask = pd.Series(False, index=df.index)
            for r in results:
                if r.outlier_count > 0:
                    s_num = pd.to_numeric(df[r.column], errors="coerce")
                    col_mask = (s_num < r.lower_bound) | (s_num > r.upper_bound)
                    combined_mask = combined_mask | col_mask
            affected_records = int(combined_mask.sum())

        overview = OutlierOverview(
            total_anomalies=total_anomalies,
            affected_features=affected_features,
            total_features=len(results),
            anomaly_rate=cls.safe_float(max_rate) or 0.0,
            most_affected_feature=most_affected,
            highest_anomaly_rate=cls.safe_float(max_rate) or 0.0,
            affected_records=affected_records,
        )

        top_features: List[OutlierFeatureSummary] = []
        for r in results:
            s_num = pd.to_numeric(df[r.column], errors="coerce").dropna()
            med = cls.safe_float(s_num.median()) if not s_num.empty else 0.0

            if r.outlier_percentage >= 10.0:
                sev = "High"
            elif r.outlier_percentage >= 4.0:
                sev = "Medium"
            else:
                sev = "Low"

            top_features.append(
                OutlierFeatureSummary(
                    column=r.column,
                    label=r.label,
                    outlier_count=r.outlier_count,
                    outlier_percentage=r.outlier_percentage,
                    median=med,
                    typical_range=f"{r.lower_bound:,.1f} to {r.upper_bound:,.1f}",
                    severity=sev,
                    q1=r.q1,
                    q3=r.q3,
                    iqr=r.iqr,
                    lower_bound=r.lower_bound,
                    upper_bound=r.upper_bound,
                )
            )

        # Inspect individual records that contain outliers (limit to 100)
        inspections: List[OutlierInspectionRecord] = []
        dim_cols = [
            dc.name for dc in detected_columns
            if (dc.semantic_role in ["category", "department", "geography", "status", "product", "customer", "student", "employee"]
                or dc.is_identifier) and dc.name in df.columns
        ][:4]

        entity_col = None
        for dc in detected_columns:
            if dc.semantic_role in ["product", "customer", "student", "employee"] and dc.name in df.columns:
                entity_col = dc.name
                break

        for r in results:
            if r.outlier_count == 0 or len(inspections) >= 100:
                continue
            col_name = r.column
            s_num = pd.to_numeric(df[col_name], errors="coerce")
            outlier_mask = (s_num < r.lower_bound) | (s_num > r.upper_bound)
            outlier_rows = df[outlier_mask].head(25)

            for idx, row in outlier_rows.iterrows():
                if len(inspections) >= 100:
                    break
                val = cls.safe_float(s_num.loc[idx])
                if val is None:
                    continue

                diff = max(r.lower_bound - val, val - r.upper_bound, 0)
                sev = "High" if (r.iqr > 0 and diff > 2.0 * r.iqr) else "Medium"

                dims_dict = {}
                for d_col in dim_cols:
                    d_val = row.get(d_col)
                    if pd.notna(d_val):
                        dims_dict[d_col] = str(d_val)

                ent_name = str(row.get(entity_col)) if (entity_col and pd.notna(row.get(entity_col))) else None

                inspections.append(
                    OutlierInspectionRecord(
                        id=f"outlier_{idx}_{col_name}",
                        row_index=int(idx) + 1,
                        entity_name=ent_name,
                        column=col_name,
                        column_label=r.label,
                        value=val,
                        expected_lower=r.lower_bound,
                        expected_upper=r.upper_bound,
                        severity=sev,
                        reason=f"{val:,.1f} outside typical range [{r.lower_bound:,.1f} to {r.upper_bound:,.1f}]",
                        dimensions=dims_dict,
                    )
                )

        return OutliersAnalytics(
            available=len(results) > 0,
            results=results,
            overview=overview,
            top_features=top_features,
            inspections=inspections,
        )

    @classmethod
    def compute_geography(
        cls,
        df: pd.DataFrame,
        detected_columns: List[DetectedColumn],
        capabilities: DatasetCapabilities,
        primary_metric: Optional[MetricSummary],
    ) -> GeographyAnalytics:
        """Computes spatial rankings and metric totals by geographic dimension."""
        if not capabilities.geography:
            return GeographyAnalytics(available=False)

        geo_cols = [
            dc.name for dc in detected_columns
            if dc.semantic_role == "geography" and dc.name in df.columns
        ]
        if not geo_cols:
            return GeographyAnalytics(available=False)

        metric_col = primary_metric.column if (primary_metric and primary_metric.column in df.columns) else None
        num_s = pd.to_numeric(df[metric_col], errors="coerce").fillna(0) if metric_col else None

        dimensions: List[GeographyDimension] = []
        for col in geo_cols[:2]:
            s = df[col].dropna().astype(str).str.strip()
            if s.empty:
                continue

            top_locs = s.value_counts().head(10)
            loc_points: List[GeographicPoint] = []
            for loc_name, cnt in top_locs.items():
                tot_m: Optional[float] = None
                avg_m: Optional[float] = None
                if num_s is not None:
                    loc_mask = (df[col].astype(str).str.strip() == loc_name)
                    loc_vals = num_s[loc_mask]
                    if not loc_vals.empty:
                        tot_m = cls.safe_float(loc_vals.sum())
                        avg_m = cls.safe_float(loc_vals.mean())

                loc_points.append(
                    GeographicPoint(
                        location=str(loc_name),
                        count=int(cnt),
                        total_metric=tot_m,
                        average_metric=avg_m,
                    )
                )

            dimensions.append(
                GeographyDimension(
                    column=col,
                    label=cls.format_title(col),
                    locations=loc_points,
                )
            )

        return GeographyAnalytics(
            available=len(dimensions) > 0,
            dimensions=dimensions,
        )

    @classmethod
    def compute_data_quality(
        cls,
        df: pd.DataFrame,
        profile: DatasetProfileResponse,
    ) -> DataQualityAnalytics:
        """Formats comprehensive column health and data quality scorecards."""
        total_rows = len(df)
        total_cols = len(df.columns)

        col_items: List[ColumnQualityItem] = []
        for col_name in df.columns:
            s = df[col_name]
            missing_c = int(s.isna().sum())
            missing_p = cls.safe_float((missing_c / total_rows) * 100) if total_rows > 0 else 0.0
            unique_c = int(s.nunique())
            unique_p = cls.safe_float((unique_c / total_rows) * 100) if total_rows > 0 else 0.0

            col_items.append(
                ColumnQualityItem(
                    column=col_name,
                    type=str(s.dtype),
                    missing_count=missing_c,
                    missing_percentage=missing_p or 0.0,
                    unique_count=unique_c,
                    unique_percentage=unique_p or 0.0,
                )
            )

        return DataQualityAnalytics(
            score=cls.safe_float(profile.quality.score) or 100.0,
            label=profile.quality.label,
            total_rows=total_rows,
            total_columns=total_cols,
            total_missing_values=profile.summary.total_missing_values,
            missing_value_percentage=cls.safe_float(profile.summary.missing_value_percentage) or 0.0,
            duplicate_rows=profile.dataset.duplicate_rows,
            duplicate_percentage=cls.safe_float(profile.dataset.duplicate_percentage) or 0.0,
            columns=col_items,
        )

    @classmethod
    def compute_overview_kpis(
        cls,
        df: pd.DataFrame,
        profile: DatasetProfileResponse,
        primary_metric: Optional[MetricSummary],
        value_metric: Optional[MetricSummary],
        detected_columns: List[DetectedColumn],
    ) -> OverviewAnalytics:
        """Constructs high-impact dynamic KPI cards for the Overview module."""
        total_rows = len(df)
        kpis: List[DynamicKPI] = []

        is_filtered = total_rows < profile.dataset.rows
        if is_filtered and profile.dataset.rows > 0:
            pct_filtered = (total_rows / profile.dataset.rows) * 100
            subtitle_records = f"{pct_filtered:.1f}% of {profile.dataset.rows:,} total records"
        else:
            subtitle_records = "Analyzed dataset records"

        # 1. Total Volume / Records
        kpis.append(
            DynamicKPI(
                id="kpi-records",
                label="Total Records",
                value=total_rows,
                formatted_value=f"{total_rows:,}",
                subtitle=subtitle_records,
                icon="database",
                category="volume",
            )
        )

        # 2. Dimensions / Columns
        kpis.append(
            DynamicKPI(
                id="kpi-columns",
                label="Attributes",
                value=len(df.columns),
                formatted_value=str(len(df.columns)),
                subtitle="Captured feature dimensions",
                icon="columns",
                category="structure",
            )
        )

        # 3. Data Health Score
        kpis.append(
            DynamicKPI(
                id="kpi-health",
                label="Data Health Score",
                value=profile.quality.score,
                formatted_value=f"{profile.quality.score:.1f}%",
                subtitle=f"Status: {profile.quality.label}",
                icon="shield-check",
                category="quality",
            )
        )

        # 4. Primary / Monetary Metric KPI
        if value_metric and value_metric.statistics.total is not None:
            tot = value_metric.statistics.total
            avg = value_metric.statistics.average or 0.0
            kpis.append(
                DynamicKPI(
                    id="kpi-value-metric",
                    label=f"Total {value_metric.label}",
                    value=tot,
                    formatted_value=f"{tot:,.2f}" if tot >= 1000 else f"{tot:.2f}",
                    subtitle=f"Avg: {avg:,.2f} per record",
                    icon="trending-up",
                    category="metric",
                )
            )
        elif primary_metric and primary_metric.statistics.average is not None:
            avg = primary_metric.statistics.average
            min_v = primary_metric.statistics.min or 0.0
            max_v = primary_metric.statistics.max or 0.0
            kpis.append(
                DynamicKPI(
                    id="kpi-primary-metric",
                    label=f"Average {primary_metric.label}",
                    value=avg,
                    formatted_value=f"{avg:.2f}",
                    subtitle=f"Range: {min_v:.1f} – {max_v:.1f}",
                    icon="bar-chart-2",
                    category="metric",
                )
            )

        # 5. Entity Specific Count (e.g. Unique Customers, Students, Employees, Products)
        role_map: Dict[str, List[str]] = {}
        for dc in detected_columns:
            if dc.semantic_role and dc.name in df.columns:
                role_map.setdefault(dc.semantic_role, []).append(dc.name)

        entity_roles = ["customer", "student", "employee", "product", "department", "category"]
        for role in entity_roles:
            if role in role_map:
                col_name = role_map[role][0]
                unique_c = df[col_name].nunique()
                kpis.append(
                    DynamicKPI(
                        id=f"kpi-entity-{role}",
                        label=f"Unique {cls.format_title(role)}s",
                        value=unique_c,
                        formatted_value=f"{unique_c:,}",
                        subtitle=f"Distinct entries in {col_name}",
                        icon="users" if role in ["customer", "student", "employee"] else "package",
                        category="entity",
                    )
                )
                break

        return OverviewAnalytics(kpis=kpis)

    @classmethod
    def generate_factual_insights(
        cls,
        df: pd.DataFrame,
        profile: DatasetProfileResponse,
        primary_metric: Optional[MetricSummary],
        value_metric: Optional[MetricSummary],
        trends: TrendsAnalytics,
        distributions: DistributionsAnalytics,
        rankings: RankingsAnalytics,
        correlations: CorrelationsAnalytics,
        outliers: OutliersAnalytics,
    ) -> List[str]:
        """Synthesizes human-readable, factual business insights from computed statistics."""
        insights: List[str] = []
        total_rows = len(df)
        total_cols = len(df.columns)

        # 1. Overall health & scale
        health_score = profile.quality.score
        insights.append(
            f"Dataset encompasses {total_rows:,} records across {total_cols} attributes with an overall Data Health Score of {health_score:.1f}% ({profile.quality.label})."
        )

        # 2. Financial / Quantitative impact
        if value_metric and value_metric.statistics.total is not None:
            tot = value_metric.statistics.total
            avg = value_metric.statistics.average or 0.0
            insights.append(
                f"Cumulative {value_metric.label} stands at {tot:,.2f} with a mean value of {avg:,.2f} and median of {value_metric.statistics.median or 0:,.2f}."
            )
        elif primary_metric and primary_metric.statistics.average is not None:
            avg = primary_metric.statistics.average
            insights.append(
                f"Benchmark {primary_metric.label} reflects an average of {avg:.2f} (ranging from {primary_metric.statistics.min or 0:.1f} to {primary_metric.statistics.max or 0:.1f})."
            )

        # 3. Peak Chronological Velocity
        if trends.available and trends.peak_period:
            insights.append(
                f"Temporal velocity peaked during period '{trends.peak_period}' reaching {trends.peak_value:,.2f} across {trends.total_periods} recorded cycles."
            )

        # 4. Dominant Category Distribution
        if distributions.available and distributions.dimensions:
            first_dim = distributions.dimensions[0]
            if first_dim.categories:
                top_cat = first_dim.categories[0]
                insights.append(
                    f"In {first_dim.label}, '{top_cat.category}' leads the distribution with {top_cat.percentage:.1f}% share ({top_cat.count:,} records)."
                )

        # 5. Ranking Leader
        if rankings.available and rankings.rankings:
            first_rank = rankings.rankings[0]
            if first_rank.items:
                leader = first_rank.items[0]
                pct_str = f" ({leader.percentage:.1f}% of total)" if leader.percentage is not None else ""
                insights.append(
                    f"Top ranking {first_rank.label} is '{leader.name}' generating {leader.value:,.2f}{pct_str}."
                )

        # 6. Correlation Discovery
        if correlations.available and correlations.strongest_positive:
            sp = correlations.strongest_positive
            if sp.correlation >= 0.4:
                insights.append(
                    f"Identified significant positive correlation between '{cls.format_title(sp.col1)}' and '{cls.format_title(sp.col2)}' (r = +{sp.correlation:.2f})."
                )

        # 7. Unusual Values Assessment
        if outliers.available:
            cols_with_outliers = [o for o in outliers.results if o.outlier_count > 0]
            if cols_with_outliers:
                worst = max(cols_with_outliers, key=lambda x: x.outlier_percentage)
                insights.append(
                    f"'{worst.label}' contains statistically unusual values in {worst.outlier_percentage:.1f}% of observations ({worst.outlier_count} records outside 1.5× IQR)."
                )
            else:
                insights.append("Statistical boundary check confirmed zero unusual values across analyzed numerical metrics.")

        return insights

    @classmethod
    def compute_why_this_matters(
        cls,
        df: pd.DataFrame,
        primary_metric: Optional[MetricSummary],
        value_metric: Optional[MetricSummary],
        trends: TrendsAnalytics,
        distributions: DistributionsAnalytics,
        rankings: RankingsAnalytics,
        correlations: CorrelationsAnalytics,
        outliers: OutliersAnalytics,
        data_quality: DataQualityAnalytics,
    ) -> Dict[str, str]:
        """Generates factual business and analytical interpretations for each module."""
        wtm = {}

        # Overview
        wtm["overview"] = (
            f"The dataset encompasses {len(df):,} records and {len(df.columns)} attributes with an overall Data Health Score of {data_quality.score:.1f}%. "
            "Establishing baseline volume and health ensures subsequent segmentation and metric analyses are statistically representative."
        )

        # Trends
        if trends.available and trends.peak_period:
            wtm["trends"] = (
                f"Activity peaked during '{trends.peak_period}' reaching {trends.peak_value:,.1f}. "
                "Tracking chronological velocity helps identify operational surges, cyclical variations, or reporting cadence anomalies without making unsupported causal leaps."
            )
        else:
            wtm["trends"] = "Chronological tracking maps trajectory and velocity across recording intervals."

        # Distributions
        if distributions.available and distributions.dimensions:
            first_dim = distributions.dimensions[0]
            if first_dim.categories:
                top_cat = first_dim.categories[0]
                wtm["distributions"] = (
                    f"'{top_cat.category}' forms the primary segment ({top_cat.percentage:.1f}% share of {first_dim.label}). "
                    "Category concentration indicates whether dataset activity is broadly distributed or heavily concentrated in specific core segments."
                )
        if "distributions" not in wtm:
            wtm["distributions"] = "Categorical distributions indicate classification shares and taxonomic balance."

        # Rankings
        if rankings.available and rankings.rankings:
            first_rank = rankings.rankings[0]
            if first_rank.items:
                leader = first_rank.items[0]
                pct_str = f" ({leader.percentage:.1f}% contribution)" if leader.percentage is not None else ""
                wtm["rankings"] = (
                    f"'{leader.name}' leads {first_rank.label}{pct_str}. "
                    "Leaderboards highlight performance skew, where a small cohort of entities may drive a significant share of cumulative results."
                )
        if "rankings" not in wtm:
            wtm["rankings"] = "Leaderboards highlight top contributors driving overall performance."

        # Correlations
        if correlations.available and correlations.strongest_positive:
            sp = correlations.strongest_positive
            wtm["correlations"] = (
                f"Strongest co-movement identified between '{cls.format_title(sp.col1)}' and '{cls.format_title(sp.col2)}' (r = +{sp.correlation:.2f}). "
                "Statistical correlation indicates mathematical co-movement across measures; however, correlation does not imply causation."
            )
        else:
            wtm["correlations"] = "Correlation analysis maps pairwise numerical co-movement. Correlation does not imply causation."

        # Outliers
        if outliers.available and outliers.overview and outliers.overview.total_anomalies > 0:
            ov = outliers.overview
            wtm["outliers"] = (
                f"{ov.total_anomalies:,} values ({ov.anomaly_rate:.1f}% peak anomaly rate) fall beyond 1.5× IQR fences, with greatest concentration in '{ov.most_affected_feature}'. "
                "Extreme outliers may indicate specialized tiers, unique high-magnitude events, measurement variations, or data-entry anomalies that merit inspection."
            )
        else:
            wtm["outliers"] = "Anomaly screening verifies that numerical measures remain within expected interquartile boundaries without extreme distortions."

        # Data Quality
        wtm["data-quality"] = (
            f"Dataset reflects a {data_quality.label} completeness score ({data_quality.score:.1f}%). "
            f"Screening identified {data_quality.total_missing_values:,} missing cells ({data_quality.missing_value_percentage:.1f}%) and {data_quality.duplicate_rows:,} duplicate records. "
            "Resolving null values and duplicate records helps prevent skewed statistical averages and biased segmentation."
        )

        # Geography
        wtm["geography"] = (
            "Regional distribution highlights territorial coverage and location concentration across recorded regions."
        )

        # Insights
        wtm["insights"] = (
            "Automated discoveries summarize factual statistical findings calculated directly from the dataset without preconceived assumptions."
        )

        return wtm

    @classmethod
    def extract_filter_options(
        cls,
        df: pd.DataFrame,
        detected_columns: List[DetectedColumn],
    ) -> List[ColumnFilterOption]:
        """
        Extracts smart filter candidates across categorical, numeric, and date dimensions.
        Selects top 3-4 as primary filters and exposes others under more filters.
        """
        if df.empty:
            return []

        filters: List[ColumnFilterOption] = []
        candidates: List[Tuple[int, DetectedColumn]] = []

        for dc in detected_columns:
            if dc.is_identifier or dc.name not in df.columns:
                continue

            s = df[dc.name]
            non_null = s.dropna()
            if non_null.empty:
                continue

            priority = 100
            # 1. High-value categorical dimensions
            if dc.semantic_role in ["category", "department", "customer", "student", "employee", "segment"]:
                priority = 1
            # 2. Date columns
            elif dc.type == "datetime" or dc.semantic_role == "date":
                priority = 2
            # 3. Geographic dimensions
            elif dc.semantic_role in ["geography", "state", "city", "region"]:
                priority = 3
            # 4. Important business dimensions
            elif dc.semantic_role in ["status", "payment_method"]:
                priority = 4
            # 5. Other discrete categorical dimensions
            elif dc.type == "categorical":
                u_cnt = non_null.nunique()
                if 2 <= u_cnt <= 80:
                    priority = 5
            # 6. Useful numeric metrics
            elif dc.semantic_role in ["monetary_value", "score", "quantity"]:
                priority = 6
            # 7. Boolean dimensions
            elif dc.type == "boolean":
                priority = 7
            # 8. Continuous numeric with variance
            elif dc.type == "numeric":
                s_num = pd.to_numeric(s, errors="coerce").dropna()
                if len(s_num) >= 2 and s_num.std() > 0:
                    priority = 8
            # 9. Low-cardinality text
            elif dc.type == "text":
                u_cnt = non_null.nunique()
                if 2 <= u_cnt <= 30:
                    priority = 9

            if priority < 100:
                candidates.append((priority, dc))

        candidates.sort(key=lambda x: x[0])

        count_primary = 0
        for _, dc in candidates[:25]:
            s = df[dc.name]
            col_name = dc.name
            label = cls.format_title(col_name)

            if dc.type == "datetime" or dc.semantic_role == "date":
                s_dt = pd.to_datetime(s, errors="coerce").dropna()
                if not s_dt.empty:
                    min_d = s_dt.min().strftime("%Y-%m-%d")
                    max_d = s_dt.max().strftime("%Y-%m-%d")
                    is_prim = count_primary < 4
                    if is_prim:
                        count_primary += 1
                    filters.append(
                        ColumnFilterOption(
                            column=col_name,
                            label=label,
                            type="datetime",
                            is_primary=is_prim,
                            min_date=min_d,
                            max_date=max_d,
                        )
                    )
            elif dc.type == "boolean" or (non_null.nunique() == 2 and dc.type in ["categorical", "boolean"]):
                vc = s.dropna().astype(str).str.strip().value_counts()
                options = [
                    FilterOptionItem(value=str(val), count=int(cnt))
                    for val, cnt in vc.items()
                    if str(val) != "" and str(val).lower() != "nan"
                ]
                is_prim = count_primary < 4
                if is_prim:
                    count_primary += 1
                filters.append(
                    ColumnFilterOption(
                        column=col_name,
                        label=label,
                        type="boolean",
                        is_primary=is_prim,
                        options=options,
                    )
                )
            elif dc.type in ["categorical", "text"] or dc.semantic_role in ["category", "department", "geography", "status", "payment_method", "customer", "student", "employee", "segment"]:
                vc = s.dropna().astype(str).str.strip().value_counts()
                if len(vc) >= 2:
                    options = [
                        FilterOptionItem(value=str(val), count=int(cnt))
                        for val, cnt in vc.head(60).items()
                        if str(val) != "" and str(val).lower() != "nan"
                    ]
                    if options:
                        is_prim = count_primary < 4
                        if is_prim:
                            count_primary += 1
                        filters.append(
                            ColumnFilterOption(
                                column=col_name,
                                label=label,
                                type="categorical",
                                is_primary=is_prim,
                                options=options,
                            )
                        )
            elif dc.type == "numeric":
                s_num = pd.to_numeric(s, errors="coerce").dropna()
                if len(s_num) >= 2 and s_num.std() > 0:
                    min_v = cls.safe_float(s_num.min())
                    max_v = cls.safe_float(s_num.max())
                    if min_v is not None and max_v is not None and min_v < max_v:
                        is_prim = count_primary < 4
                        if is_prim:
                            count_primary += 1
                        filters.append(
                            ColumnFilterOption(
                                column=col_name,
                                label=label,
                                type="numeric",
                                is_primary=is_prim,
                                min_value=min_v,
                                max_value=max_v,
                            )
                        )

        return filters

    @classmethod
    def compute(
        cls,
        df: pd.DataFrame,
        detected_columns: List[DetectedColumn],
        capabilities: DatasetCapabilities,
        profile: DatasetProfileResponse,
        chosen_metric: Optional[str] = None,
    ) -> DatasetAnalytics:
        """
        Master calculation pipeline: builds the complete DatasetAnalytics payload.
        """
        value_metric, primary_metric = cls.find_key_metrics(df, detected_columns)
        if chosen_metric and chosen_metric in df.columns:
            dc_match = next((dc for dc in detected_columns if dc.name == chosen_metric), None)
            stats = cls.compute_metric_stats(df[chosen_metric])
            primary_metric = MetricSummary(
                available=True,
                column=chosen_metric,
                label=cls.format_title(chosen_metric),
                semantic_role=dc_match.semantic_role if dc_match else None,
                statistics=stats,
            )
        overview = cls.compute_overview_kpis(df, profile, primary_metric, value_metric, detected_columns)
        trends = cls.compute_trends(df, detected_columns, capabilities, primary_metric)
        distributions = cls.compute_distributions(df, detected_columns, primary_metric)
        rankings = cls.compute_rankings(df, detected_columns, primary_metric)
        correlations = cls.compute_correlations(df, detected_columns)
        outliers = cls.compute_outliers(df, detected_columns)
        geography = cls.compute_geography(df, detected_columns, capabilities, primary_metric)
        data_quality = cls.compute_data_quality(df, profile)
        insights = cls.generate_factual_insights(
            df,
            profile,
            primary_metric,
            value_metric,
            trends,
            distributions,
            rankings,
            correlations,
            outliers,
        )
        why_this_matters = cls.compute_why_this_matters(
            df,
            primary_metric,
            value_metric,
            trends,
            distributions,
            rankings,
            correlations,
            outliers,
            data_quality,
        )

        return DatasetAnalytics(
            overview=overview,
            primary_metric=primary_metric,
            value_metric=value_metric,
            trends=trends,
            distributions=distributions,
            rankings=rankings,
            geography=geography,
            correlations=correlations,
            outliers=outliers,
            data_quality=data_quality,
            insights=insights,
            why_this_matters=why_this_matters,
        )

    @classmethod
    def compare_segments(
        cls,
        df: pd.DataFrame,
        detected_columns: List[DetectedColumn],
        dimension: str,
        segment_a: str,
        segment_b: str,
    ) -> SegmentComparisonResponse:
        """
        Calculates side-by-side comparative analytics between two segments
        across all numerical dimensions with real factual differences.
        """
        total_rows = len(df)
        if total_rows == 0 or dimension not in df.columns:
            raise ValueError(f"Dimension '{dimension}' not found in dataset.")

        s_dim = df[dimension].astype(str).str.strip()
        df_a = df[s_dim == str(segment_a).strip()]
        df_b = df[s_dim == str(segment_b).strip()]

        numeric_cols = [
            dc.name for dc in detected_columns
            if dc.type == "numeric" and not dc.is_identifier and dc.name in df.columns
        ]

        def compute_stats(sub_df: pd.DataFrame) -> Dict[str, SegmentMetricStats]:
            stats = {}
            for col in numeric_cols:
                s_num = pd.to_numeric(sub_df[col], errors="coerce").dropna()
                if len(s_num) > 0:
                    stats[col] = SegmentMetricStats(
                        mean=cls.safe_float(s_num.mean()) or 0.0,
                        median=cls.safe_float(s_num.median()) or 0.0,
                        sum=cls.safe_float(s_num.sum()) or 0.0,
                        min=cls.safe_float(s_num.min()) or 0.0,
                        max=cls.safe_float(s_num.max()) or 0.0,
                        std=cls.safe_float(s_num.std()) if len(s_num) > 1 else None,
                    )
                else:
                    stats[col] = SegmentMetricStats()
            return stats

        stats_a = compute_stats(df_a)
        stats_b = compute_stats(df_b)

        seg_a_rows = len(df_a)
        seg_b_rows = len(df_b)
        pct_a = (seg_a_rows / total_rows * 100) if total_rows > 0 else 0.0
        pct_b = (seg_b_rows / total_rows * 100) if total_rows > 0 else 0.0

        comparison: List[MetricComparisonDetail] = []
        for col in numeric_cols:
            sa = stats_a.get(col, SegmentMetricStats())
            sb = stats_b.get(col, SegmentMetricStats())

            mean_diff = sa.mean - sb.mean
            mean_pct = ((sa.mean - sb.mean) / sb.mean * 100) if sb.mean != 0 else (100.0 if sa.mean > 0 else 0.0)

            sum_diff = sa.sum - sb.sum
            sum_pct = ((sa.sum - sb.sum) / sb.sum * 100) if sb.sum != 0 else (100.0 if sa.sum > 0 else 0.0)

            comparison.append(
                MetricComparisonDetail(
                    metric=col,
                    metric_label=cls.format_title(col),
                    a_mean=sa.mean,
                    b_mean=sb.mean,
                    mean_difference=cls.safe_float(mean_diff) or 0.0,
                    mean_percent_change=cls.safe_float(mean_pct) or 0.0,
                    a_median=sa.median,
                    b_median=sb.median,
                    a_sum=sa.sum,
                    b_sum=sb.sum,
                    sum_difference=cls.safe_float(sum_diff) or 0.0,
                    sum_percent_change=cls.safe_float(sum_pct) or 0.0,
                    a_min=sa.min,
                    b_min=sb.min,
                    a_max=sa.max,
                    b_max=sb.max,
                )
            )

        takeaways = [
            f"Segment '{segment_a}' accounts for {seg_a_rows:,} records ({pct_a:.1f}% share), whereas '{segment_b}' accounts for {seg_b_rows:,} records ({pct_b:.1f}% share).",
        ]
        if comparison:
            top_diff = max(comparison, key=lambda c: abs(c.mean_percent_change))
            sign = "higher" if top_diff.mean_percent_change > 0 else "lower"
            takeaways.append(
                f"'{top_diff.metric_label}' exhibits the highest disparity: '{segment_a}' averages {top_diff.a_mean:,.2f} compared to {top_diff.b_mean:,.2f} for '{segment_b}' ({abs(top_diff.mean_percent_change):.1f}% {sign})."
            )

        return SegmentComparisonResponse(
            success=True,
            dimension=dimension,
            dimension_label=cls.format_title(dimension),
            segment_a=SegmentData(
                name=segment_a,
                rows=seg_a_rows,
                percentage_of_total=cls.safe_float(pct_a) or 0.0,
                metrics=stats_a,
            ),
            segment_b=SegmentData(
                name=segment_b,
                rows=seg_b_rows,
                percentage_of_total=cls.safe_float(pct_b) or 0.0,
                metrics=stats_b,
            ),
            metrics=comparison,
            takeaways=takeaways,
        )
