import re
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np
import pandas as pd

from backend.app.analytics.dataset_cache import dataset_cache
from backend.app.analytics.dataset_profiler import DatasetProfiler
from backend.app.analytics.statistical_calculator import StatisticalCalculator
from backend.app.core.logging import logger
from backend.app.schemas.intelligence import (
    DatasetAnalysisResponse,
    DatasetCapabilities,
    DetectedColumn,
    DynamicModuleCandidate,
)
from backend.app.schemas.upload import FileMetadata, DatasetProfileResponse


class DatasetIntelligenceEngine:
    """
    Generic Dataset Intelligence Layer.
    Detects column types, identifies entity semantic roles with confidence scores,
    evaluates dataset analytical capabilities, and generates dynamic module candidates.
    """

    KNOWN_INDIAN_STATES: Set[str] = {
        "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh",
        "goa", "gujarat", "haryana", "himachal pradesh", "jharkhand", "karnataka",
        "kerala", "madhya pradesh", "maharashtra", "manipur", "meghalaya", "mizoram",
        "nagaland", "odisha", "punjab", "rajasthan", "sikkim", "tamil nadu",
        "telangana", "tripura", "uttar pradesh", "uttarakhand", "west bengal",
        "delhi", "jammu and kashmir", "ladakh", "puducherry", "chandigarh"
    }

    KNOWN_COUNTRIES: Set[str] = {
        "india", "united states", "usa", "united kingdom", "uk", "canada",
        "germany", "australia", "france", "japan", "china", "brazil", "singapore",
        "united arab emirates", "uae", "netherlands", "switzerland", "south africa"
    }

    KNOWN_PAYMENT_MODES: Set[str] = {
        "credit card", "credit_card", "debit card", "debit_card", "upi", "cash",
        "net banking", "netbanking", "voucher", "wallet", "paypal", "cheque", "cod",
        "cash on delivery", "emi", "bank transfer"
    }

    UUID_REGEX = re.compile(
        r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
        re.IGNORECASE,
    )
    ID_CODE_REGEX = re.compile(
        r'^[A-Z]{1,5}[-_]?[0-9]{2,10}$',
        re.IGNORECASE,
    )

    @classmethod
    def tokenize(cls, name: str) -> List[str]:
        """Split string into lowercase tokens on camelCase, snake_case, kebab-case, and spaces."""
        s = re.sub(r'([a-z0-9])([A-Z])', r'\1 \2', name)
        tokens = re.split(r'[_ \-\./]+', s.lower().strip())
        return [t for t in tokens if t]

    @classmethod
    def _is_identifier_column(cls, s: pd.Series, col_name: str, total_rows: int) -> Tuple[bool, float, Optional[str]]:
        """
        Determines whether a column serves as an entity identifier or primary key.
        Checks uniqueness ratio, name keywords, sequential numbers, and value patterns.
        """
        non_null = s.dropna()
        if non_null.empty or total_rows < 3:
            return False, 0.0, None

        unique_count = non_null.nunique()
        unique_ratio = unique_count / len(non_null)
        tokens = set(cls.tokenize(col_name))
        lower_name = col_name.lower().strip()

        id_name_keywords = {
            "id", "uuid", "guid", "code", "key", "sku", "roll", "rollno",
            "roll_number", "enrollment", "ticket", "hash", "ref", "reference",
            "cin", "pan", "ssn", "index", "pnr", "account_no", "account_number"
        }
        has_id_keyword = (
            bool(tokens.intersection(id_name_keywords))
            or lower_name.endswith("_id")
            or lower_name.startswith("id_")
            or lower_name == "id"
        )

        sample_strs = non_null.head(50).astype(str).str.strip()

        # Check for UUID format
        if sample_strs.map(lambda x: bool(cls.UUID_REGEX.match(x))).mean() >= 0.8:
            return True, 0.98, "Values match UUID structure"

        # Check for alphanumeric ID pattern like EMP-101, ORD_9944, S01
        if sample_strs.map(lambda x: bool(cls.ID_CODE_REGEX.match(x))).mean() >= 0.8:
            return True, 0.95, "Values follow alphanumeric entity code pattern"

        # Check for sequential integer primary key
        if pd.api.types.is_integer_dtype(s) and unique_ratio == 1.0:
            diffs = non_null.sort_values().diff().dropna()
            if not diffs.empty and (diffs == 1).mean() >= 0.8:
                return True, 0.96, "Sequential primary key integers"

        # High uniqueness combined with ID keywords
        if unique_ratio >= 0.85 and has_id_keyword:
            return True, 0.92, f"High uniqueness ({unique_ratio:.1%}) with identifier name"

        if unique_count == total_rows and total_rows >= 5 and has_id_keyword:
            return True, 0.95, "100% unique values with identifier name"

        return False, 0.0, None

    @classmethod
    def detect_column_type(cls, s: pd.Series, col_name: str, total_rows: int) -> Tuple[str, bool, Optional[str]]:
        """
        Classifies column technical type:
        numeric, categorical, datetime, boolean, text, or identifier.
        """
        is_id, id_conf, id_reason = cls._is_identifier_column(s, col_name, total_rows)
        if is_id and id_conf >= 0.85:
            return "identifier", True, id_reason

        # Boolean
        if pd.api.types.is_bool_dtype(s):
            return "boolean", False, "Native boolean dtype"

        non_null = s.dropna()
        if non_null.empty:
            return "text", False, "Empty column"

        if s.dtype == "object":
            unique_vals = set(non_null.unique())
            if unique_vals.issubset({True, False, "true", "false", "True", "False", "yes", "no", "Yes", "No", 0, 1}):
                return "boolean", False, "Boolean values subset"

        # Datetime
        if pd.api.types.is_datetime64_any_dtype(s):
            return "datetime", False, "Native datetime dtype"

        # Safe string date detection
        if (s.dtype == "object" or pd.api.types.is_string_dtype(s)) and DatasetProfiler._is_safe_date_column(non_null):
            return "datetime", False, "Date-like string format"

        # Numeric
        if pd.api.types.is_numeric_dtype(s):
            return "numeric", False, "Numeric numeric dtype"

        # Categorical vs Text
        unique_count = non_null.nunique()
        str_series = non_null.astype(str).str.strip()
        avg_len = str_series.str.len().mean() if not str_series.empty else 0
        avg_words = str_series.str.split().str.len().mean() if not str_series.empty else 0
        unique_ratio = unique_count / len(non_null) if len(non_null) > 0 else 0.0

        if isinstance(s.dtype, pd.CategoricalDtype):
            return "categorical", False, "Categorical dtype"

        text_keywords = {"note", "notes", "desc", "description", "comment", "comments", "review", "reviews", "text", "message", "bio", "summary", "feedback", "address"}
        tokens = set(cls.tokenize(col_name))
        if tokens.intersection(text_keywords) or avg_words >= 3.0 or avg_len > 45:
            return "text", False, "Multi-word free text content"

        if unique_count <= 100 and (unique_ratio <= 0.5 or len(non_null) <= 20 or avg_words <= 2.0):
            return "categorical", False, "Discrete categorical cardinality"

        return "text", False, "General text dimension"

    @classmethod
    def detect_semantic_role(
        cls,
        s: pd.Series,
        col_name: str,
        col_type: str,
        is_identifier: bool,
    ) -> Tuple[Optional[str], float, Optional[str]]:
        """
        Detects semantic business role with an associated confidence score (0.0 to 1.0).
        Evaluates column name tokens, values, ranges, and domain heuristics.
        """
        if is_identifier:
            return "identifier", 0.95, "Entity primary or reference identifier"

        tokens = set(cls.tokenize(col_name))
        lower_name = col_name.lower().strip()
        non_null = s.dropna()
        if non_null.empty:
            return None, 0.0, None

        # 1. Date Role
        if col_type == "datetime":
            return "date", 0.98, "Temporal date or timestamp dimension"
        date_keywords = {"date", "time", "timestamp", "year", "month", "quarter", "period", "dob", "hired", "joined", "admission"}
        if tokens.intersection(date_keywords):
            return "date", 0.92, "Temporal date indicator in column name"

        # 2. Monetary Value
        money_keywords = {
            "sales", "revenue", "price", "salary", "cost", "fee", "fees",
            "amount", "billing", "turnover", "income", "profit", "loss",
            "expense", "expenses", "mrp", "fare", "charge", "charges",
            "wage", "wages", "allowance", "stipend", "budget", "dues",
            "compensation", "bonus", "spend", "spending", "earning", "earnings"
        }
        if col_type == "numeric" and tokens.intersection(money_keywords):
            return "monetary_value", 0.96, "Financial monetary amount"

        # 3. Rating / Feedback / Satisfaction
        rating_keywords = {
            "rating", "ratings", "stars", "star", "satisfaction", "nps", "review_score", "feedback_score"
        }
        if tokens.intersection(rating_keywords):
            return "rating", 0.95, "Evaluation or performance rating"

        # 4. Score / Academic / Marks / Bounded Grade
        score_keywords = {
            "score", "scores", "marks", "grade", "gpa", "cgpa", "percentage", "percentile",
            "points", "kpi_score", "accuracy", "test_score", "exam_score"
        }
        if col_type == "numeric" and tokens.intersection(score_keywords):
            # Check bounded range
            s_num = pd.to_numeric(s, errors="coerce").dropna()
            if not s_num.empty and s_num.min() >= 0 and s_num.max() <= 100:
                return "score", 0.96, "Quantitative score bounded in 0-100 scale"
            return "score", 0.92, "Performance or test score metric"

        # 5. Quantity / Volume / Units
        qty_keywords = {
            "quantity", "qty", "units", "items", "count", "stock", "inventory",
            "volume", "capacity", "hours", "credits", "attendance", "days",
            "headcount", "passengers", "occurrences", "visits", "clicks"
        }
        if col_type == "numeric" and tokens.intersection(qty_keywords):
            return "quantity", 0.92, "Physical volume or unit count"

        # 6. Category / Classification (evaluated before product so product_category -> category)
        cat_keywords = {
            "category", "sub_category", "subcategory", "genre", "classification", "sector"
        }
        if tokens.intersection(cat_keywords) or lower_name.endswith("_category") or lower_name.endswith("category"):
            return "category", 0.95, "Discrete category or classification taxonomy"

        # 7. Product / SKU / Course
        prod_keywords = {
            "product", "product_name", "item", "item_name", "goods", "sku",
            "course", "course_name", "subject", "subject_name", "article",
            "merchandise", "service", "drug", "medicine"
        }
        if tokens.intersection(prod_keywords) and not tokens.intersection(cat_keywords):
            return "product", 0.94, "Catalog product, item, or subject entity"


        # 6. Customer / Client / Patient
        cust_keywords = {
            "customer", "customer_name", "client", "buyer", "consumer",
            "subscriber", "patron", "shopper", "guest", "patient", "user", "username"
        }
        if tokens.intersection(cust_keywords):
            return "customer", 0.93, "External customer, client, or consumer"

        # 7. Employee / Staff
        emp_keywords = {
            "employee", "emp_name", "staff", "worker", "agent", "manager",
            "rep", "representative", "consultant", "engineer", "faculty",
            "teacher", "instructor", "doctor", "nurse", "technician"
        }
        if tokens.intersection(emp_keywords):
            return "employee", 0.93, "Internal employee or staff personnel"

        # 8. Student / Learner
        student_keywords = {
            "student", "student_name", "pupil", "scholar", "learner",
            "candidate", "applicant", "enrollee", "examinee"
        }
        if tokens.intersection(student_keywords):
            return "student", 0.95, "Student or academic learner entity"

        # 9. Department / Division
        dept_keywords = {
            "department", "dept", "division", "branch", "faculty_dept",
            "unit", "team", "organization", "specialization", "major", "stream"
        }
        if tokens.intersection(dept_keywords):
            return "department", 0.93, "Departmental or organizational division"

        # 10. Geography / Location
        geo_keywords = {
            "state", "city", "country", "region", "district", "province",
            "postal_code", "pincode", "zip", "zipcode", "location", "place",
            "zone", "territory", "area", "hub"
        }
        if tokens.intersection(geo_keywords):
            return "geography", 0.95, "Spatial geographic or regional entity"

        # Value inspection for known states or countries
        sample_values_lower = set(non_null.head(30).astype(str).str.lower().str.strip())
        if sample_values_lower.intersection(cls.KNOWN_INDIAN_STATES):
            return "geography", 0.96, "Detected Indian state names in values"
        if sample_values_lower.intersection(cls.KNOWN_COUNTRIES):
            return "geography", 0.96, "Detected country names in values"

        # 11. Payment Method
        pay_keywords = {"payment", "payment_mode", "payment_type", "payment_method", "pay_mode", "pay_type"}
        if tokens.intersection(pay_keywords):
            return "payment_method", 0.96, "Checkout or transaction payment mode"
        if sample_values_lower.intersection(cls.KNOWN_PAYMENT_MODES):
            return "payment_method", 0.94, "Recognized payment modes in values"

        # 12. Category
        cat_keywords = {
            "category", "sub_category", "subcategory", "genre", "type",
            "segment", "tier", "group", "classification", "sector"
        }
        if col_type == "categorical" and tokens.intersection(cat_keywords):
            return "category", 0.90, "Discrete category classification"

        # 13. Status / Outcome / Flag
        status_keywords = {
            "status", "condition", "flag", "active", "is_active", "passed",
            "approved", "delivered", "shipped", "cancelled", "result", "outcome", "stage"
        }
        if (col_type in ("categorical", "boolean")) and tokens.intersection(status_keywords):
            return "status", 0.91, "Operational status or categorical outcome"

        # Low confidence fallback - DO NOT force arbitrary roles
        return None, 0.0, None

    @classmethod
    def evaluate_capabilities(
        cls,
        df: pd.DataFrame,
        detected_columns: List[DetectedColumn],
    ) -> DatasetCapabilities:
        """
        Determines analytical feasibility purely based on actual dataset characteristics.
        """
        total_rows = len(df)
        if total_rows == 0:
            return DatasetCapabilities(kpis=False)

        role_map: Dict[str, List[str]] = {}
        for dc in detected_columns:
            if dc.semantic_role:
                role_map.setdefault(dc.semantic_role, []).append(dc.name)

        has_dates = bool(role_map.get("date")) or any(c.type == "datetime" for c in detected_columns)
        has_time_series = has_dates and total_rows >= 2

        # Count genuine numeric columns excluding identifiers
        numeric_cols = [c.name for c in detected_columns if c.type == "numeric" and not c.is_identifier]
        valid_numeric_cols = []
        for col in numeric_cols:
            s_num = pd.to_numeric(df[col], errors="coerce").dropna()
            if len(s_num) >= 2 and s_num.std() > 0:
                valid_numeric_cols.append(col)

        has_correlations = len(valid_numeric_cols) >= 2 and total_rows >= 3
        has_outliers = len(valid_numeric_cols) >= 1 and total_rows >= 5

        categorical_cols = [c.name for c in detected_columns if c.type == "categorical" and not c.is_identifier]
        has_categorical = len(categorical_cols) >= 1

        has_geography = bool(role_map.get("geography"))

        has_rankings = (
            len(categorical_cols) >= 1
            or bool(role_map.get("product"))
            or bool(role_map.get("customer"))
            or bool(role_map.get("employee"))
            or bool(role_map.get("student"))
        ) and len(valid_numeric_cols) >= 1

        has_group_comparisons = (
            bool(role_map.get("department"))
            or bool(role_map.get("category"))
            or bool(role_map.get("status"))
            or has_categorical
        ) and len(valid_numeric_cols) >= 1

        return DatasetCapabilities(
            kpis=True,
            time_series=has_time_series,
            categorical_distribution=has_categorical,
            rankings=has_rankings,
            correlations=has_correlations,
            outliers=has_outliers,
            geography=has_geography,
            group_comparisons=has_group_comparisons,
        )

    @classmethod
    def generate_modules(
        cls,
        detected_columns: List[DetectedColumn],
        capabilities: DatasetCapabilities,
    ) -> List[DynamicModuleCandidate]:
        """
        Dynamically constructs candidate analytics modules based ONLY on detected roles & capabilities.
        Does NOT inject sales modules if the data is academic, HR, operations, or generic.
        """
        role_map: Dict[str, List[str]] = {}
        for dc in detected_columns:
            if dc.semantic_role:
                role_map.setdefault(dc.semantic_role, []).append(dc.name)

        modules: List[DynamicModuleCandidate] = []

        # 1. Overview (Always present)
        modules.append(
            DynamicModuleCandidate(
                id="overview",
                title="Overview",
                description="Executive summary, vital KPI indicators, and overall dataset structure.",
                icon="layout-dashboard",
                priority=1,
                category="core",
            )
        )

        # 2. Domain / Semantic Modules (Evidence-driven only)
        # Academic / Student
        if "student" in role_map or ("score" in role_map and "employee" not in role_map and "sales" not in role_map):
            modules.append(
                DynamicModuleCandidate(
                    id="academic-performance",
                    title="Academic Performance",
                    description="Student scores, grade distribution, subject marks, and performance benchmarks.",
                    icon="graduation-cap",
                    priority=2,
                    category="domain",
                )
            )

        # Attendance tracking
        col_names_lower = [dc.name.lower() for dc in detected_columns]
        if any("attendance" in c for c in col_names_lower):
            modules.append(
                DynamicModuleCandidate(
                    id="attendance",
                    title="Attendance",
                    description="Student attendance records, session presence, and participation rates.",
                    icon="calendar-check",
                    priority=3,
                    category="domain",
                )
            )

        # Employee / Staff
        if "employee" in role_map:
            modules.append(
                DynamicModuleCandidate(
                    id="employees",
                    title="Employee Directory",
                    description="Workforce composition, staff profiles, and organizational headcount.",
                    icon="users",
                    priority=2,
                    category="domain",
                )
            )

        # Department
        if "department" in role_map:
            modules.append(
                DynamicModuleCandidate(
                    id="departments",
                    title="Departments",
                    description="Departmental breakdown, faculty divisions, and operational unit comparison.",
                    icon="building",
                    priority=3,
                    category="domain",
                )
            )

        # Students Directory
        if "student" in role_map:
            modules.append(
                DynamicModuleCandidate(
                    id="students",
                    title="Students",
                    description="Student enrollment list, class profiles, and student demographics.",
                    icon="users",
                    priority=4,
                    category="domain",
                )
            )

        # Product / Catalog
        if "product" in role_map or ("category" in role_map and ("monetary_value" in role_map or "quantity" in role_map or "customer" in role_map)):
            modules.append(
                DynamicModuleCandidate(
                    id="products",
                    title="Products",
                    description="Item performance, SKU volume, and catalog composition.",
                    icon="package",
                    priority=3,
                    category="domain",
                )
            )

        # Categories & Taxonomic Classification
        if "category" in role_map:
            modules.append(
                DynamicModuleCandidate(
                    id="categories",
                    title="Categories",
                    description="Category breakdown, segment shares, and classification taxonomy.",
                    icon="pie-chart",
                    priority=4,
                    category="domain",
                )
            )

        # Customer / Client
        if "customer" in role_map:
            modules.append(
                DynamicModuleCandidate(
                    id="customers",
                    title="Customers",
                    description="Customer account metrics, purchasing behavior, and client distribution.",
                    icon="users",
                    priority=4,
                    category="domain",
                )
            )

        # Monetary Value (Domain-aware title)
        if "monetary_value" in role_map:
            if "employee" in role_map:
                modules.append(
                    DynamicModuleCandidate(
                        id="compensation",
                        title="Salary & Compensation",
                        description="Payroll distribution, salary brackets, and compensation bands.",
                        icon="dollar-sign",
                        priority=3,
                        category="domain",
                    )
                )
            elif "student" in role_map:
                modules.append(
                    DynamicModuleCandidate(
                        id="tuition-fees",
                        title="Tuition & Fees",
                        description="Fee collections, tuition balances, and payment tracking.",
                        icon="dollar-sign",
                        priority=3,
                        category="domain",
                    )
                )
            else:
                modules.append(
                    DynamicModuleCandidate(
                        id="sales-revenue",
                        title="Sales & Revenue",
                        description="Financial performance, revenue generation, and transaction volume.",
                        icon="trending-up",
                        priority=2,
                        category="domain",
                    )
                )

        # Geography
        if capabilities.geography:
            modules.append(
                DynamicModuleCandidate(
                    id="geography",
                    title="Geography",
                    description="Territorial coverage, state/city concentrations, and regional presence.",
                    icon="map-pin",
                    priority=5,
                    category="domain",
                )
            )

        # Payment Method
        if "payment_method" in role_map:
            modules.append(
                DynamicModuleCandidate(
                    id="payments",
                    title="Payments",
                    description="Transaction channel adoption, payment gateway shares, and checkout modes.",
                    icon="credit-card",
                    priority=6,
                    category="domain",
                )
            )

        # 3. Analytical & Statistical Modules (Capability-driven)
        if capabilities.time_series:
            if "employee" in role_map:
                trend_title = "Workforce Trends"
            elif "student" in role_map:
                trend_title = "Academic Trends"
            elif "monetary_value" in role_map and "employee" not in role_map and "student" not in role_map:
                trend_title = "Sales Trends"
            else:
                trend_title = "Time-Series Trends"

            modules.append(
                DynamicModuleCandidate(
                    id="trends",
                    title=trend_title,
                    description="Chronological patterns, historical velocity, and temporal seasonality.",
                    icon="trending-up",
                    priority=2 if ("monetary_value" in role_map and "employee" not in role_map) else 7,
                    category="statistical",
                )
            )



        if capabilities.categorical_distribution:
            modules.append(
                DynamicModuleCandidate(
                    id="distributions",
                    title="Distributions & Categories",
                    description="Categorical breakdown, frequency shares, and class proportions.",
                    icon="pie-chart",
                    priority=6,
                    category="statistical",
                )
            )

        if capabilities.rankings:
            modules.append(
                DynamicModuleCandidate(
                    id="rankings",
                    title="Rankings & Leaders",
                    description="Top and bottom performers across entity categories.",
                    icon="award",
                    priority=7,
                    category="statistical",
                )
            )

        if capabilities.correlations:
            modules.append(
                DynamicModuleCandidate(
                    id="correlations",
                    title="Correlations & Multi-Metric",
                    description="Multivariate relationships and pairwise feature correlations.",
                    icon="network",
                    priority=8,
                    category="statistical",
                )
            )

        if capabilities.outliers:
            modules.append(
                DynamicModuleCandidate(
                    id="outliers",
                    title="Unusual Values",
                    description="Identify statistically unusual records that may require further investigation.",
                    icon="alert-triangle",
                    priority=9,
                    category="investigate",
                )
            )

        # 4. Automated Insights & Recommendations
        modules.append(
            DynamicModuleCandidate(
                id="insights",
                title="Insights",
                description="Automated business and performance insights generated from dataset patterns.",
                icon="lightbulb",
                priority=9,
                category="core",
            )
        )

        # 5. Data Quality
        modules.append(
            DynamicModuleCandidate(
                id="data-quality",
                title="Data Quality",
                description="Completeness scoring, null ratios, redundancy, and health assessment.",
                icon="shield-check",
                priority=10,
                category="core",
            )
        )


        # Sort by priority
        modules.sort(key=lambda m: m.priority)
        return modules

    @classmethod
    def analyze(
        cls,
        df: pd.DataFrame,
        profile: DatasetProfileResponse,
        file_metadata: FileMetadata,
    ) -> DatasetAnalysisResponse:
        """
        Executes end-to-end generic dataset intelligence analysis.
        """
        total_rows = len(df)
        detected_columns: List[DetectedColumn] = []
        semantic_roles: Dict[str, List[str]] = {}

        for col_name in df.columns:
            s = df[col_name]
            col_type, is_id, type_details = cls.detect_column_type(s, col_name, total_rows)
            role, confidence, role_details = cls.detect_semantic_role(s, col_name, col_type, is_id)

            if role:
                semantic_roles.setdefault(role, []).append(col_name)

            detected_columns.append(
                DetectedColumn(
                    name=col_name,
                    dtype=str(s.dtype),
                    type=col_type,
                    semantic_role=role,
                    confidence=round(confidence, 2),
                    is_identifier=is_id,
                    details=role_details or type_details,
                )
            )

        capabilities = cls.evaluate_capabilities(df, detected_columns)
        modules = cls.generate_modules(detected_columns, capabilities)
        analytics = StatisticalCalculator.compute(df, detected_columns, capabilities, profile)
        available_filters = StatisticalCalculator.extract_filter_options(df, detected_columns)
        dataset_id = dataset_cache.register(
            df=df,
            profile=profile,
            detected_columns=detected_columns,
            capabilities=capabilities,
            file_metadata=file_metadata,
        )

        response_dict = {
            "dataset": {
                "name": file_metadata.name,
                "rows": total_rows,
                "columns": len(df.columns),
                "memory_usage_bytes": profile.dataset.memory_usage_bytes,
                "memory_usage_mb": profile.dataset.memory_usage_mb,
            },
            "detected_columns": [dc.model_dump() for dc in detected_columns],
            "semantic_roles": semantic_roles,
            "capabilities": capabilities.model_dump(),
            "modules": [m.model_dump() for m in modules],
            "analytics": analytics.model_dump(),
            "dataset_id": dataset_id,
            "available_filters": [f.model_dump() for f in available_filters],
        }

        return DatasetAnalysisResponse(
            success=True,
            file=file_metadata,
            dataset=profile.dataset,
            profile=profile,
            detected_columns=detected_columns,
            semantic_roles=semantic_roles,
            capabilities=capabilities,
            modules=modules,
            analytics=analytics,
            dataset_id=dataset_id,
            available_filters=available_filters,
            data=response_dict,
        )
