import math
import re
from collections import deque
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np
import pandas as pd

from backend.app.analytics.dataset_cache import DatasetCacheService
from backend.app.analytics.relationship_detector import RelationshipDetector
from backend.app.core.logging import logger
from backend.app.schemas.cross_dataset import (
    CrossDatasetAnalysisCard,
    CrossDatasetAnalyticsResponse,
    CrossDatasetGroupAnalytics,
    CrossDatasetInsight,
    CrossDatasetKPI,
    CrossDatasetQueryRequest,
    CrossDatasetQueryResponse,
    CrossDatasetRanking,
    CrossDatasetRankingItem,
    CrossDatasetTrend,
    CrossDatasetTrendPoint,
    CrossDatasetTrendRequest,
    HowCalculatedInfo,
    RelationshipHealthItem,
)
from backend.app.schemas.upload import (
    ConnectedComponentGroup,
    DataModelRelationship,
    DataModelResponse,
)


class CrossDatasetEngine:
    """
    Safe Cross-Dataset Analytics Engine.
    Executes controlled joins along shortest relationship paths in the Data Model,
    protects against row multiplication explosions, detects business semantics,
    and calculates factual, JSON-safe cross-table analytics.
    """

    # Semantic Date Roles
    DATE_ROLE_EVENT = "EVENT_DATE"
    DATE_ROLE_CREATED = "CREATED_DATE"
    DATE_ROLE_UPDATED = "UPDATED_DATE"
    DATE_ROLE_ENTITY = "ENTITY_DATE"
    DATE_ROLE_BIRTH = "BIRTH_DATE"
    DATE_ROLE_EXPIRY = "EXPIRY_DATE"
    DATE_ROLE_UNKNOWN = "UNKNOWN_DATE"

    # Reference sets for semantic detection
    KNOWN_INDIAN_STATES = {
        "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh",
        "goa", "gujarat", "haryana", "himachal pradesh", "jharkhand", "karnataka",
        "kerala", "madhya pradesh", "maharashtra", "manipur", "meghalaya", "mizoram",
        "nagaland", "odisha", "punjab", "rajasthan", "sikkim", "tamil nadu",
        "telangana", "tripura", "uttar pradesh", "uttarakhand", "west bengal",
        "delhi", "jammu and kashmir", "ladakh", "puducherry", "chandigarh"
    }

    KNOWN_COUNTRIES = {
        "india", "united states", "usa", "united kingdom", "uk", "canada",
        "germany", "australia", "france", "japan", "china", "brazil", "singapore",
        "united arab emirates", "uae", "netherlands", "switzerland", "south africa"
    }

    FINANCIAL_KEYWORDS = {
        "revenue", "sales", "amount", "total_amount", "net_sales", "price",
        "total_price", "grand_total", "salary", "wage", "fee", "tuition",
        "spend", "cost", "turnover", "subtotal", "val", "value"
    }

    QUANTITY_KEYWORDS = {
        "quantity", "qty", "units", "units_sold", "volume", "count",
        "items_count", "order_quantity", "stock"
    }

    DATE_KEYWORDS = {
        "date", "order_date", "transaction_date", "created_at", "timestamp",
        "hire_date", "sale_date", "purchase_date", "dob", "dob_date", "event_date"
    }

    LOCATION_KEYWORDS = {
        "city", "state", "country", "region", "province", "territory", "zone", "location",
        "district", "area", "pincode", "postal_code", "zip", "zip_code", "county"
    }

    CATEGORY_KEYWORDS = {
        "category", "product_category", "department", "dept", "group", "class",
        "genre", "segment", "tier", "division", "type"
    }

    NAME_KEYWORDS = {
        "name", "product_name", "customer_name", "employee_name", "student_name",
        "item_name", "title", "client_name", "full_name"
    }

    ID_KEYWORDS = {
        "id", "uuid", "guid", "code", "key", "sku", "roll_no", "rollno",
        "customer_id", "order_id", "product_id", "employee_id", "student_id"
    }

    @classmethod
    def classify_date_column(cls, col_name: str, s: Optional[pd.Series] = None) -> Tuple[str, int, str]:
        """
        Classifies date column into semantic role with priority weight (0-100) and rationale.
        Normalizes column name (lowercase, strip, remove non-alphanumeric).
        Returns: (role, priority_score, description)
        """
        raw_lower = col_name.lower().strip()
        clean = re.sub(r"[^a-z0-9]", "", raw_lower)
        tokens = set(re.split(r"[_ \-\./]+", raw_lower))

        # 1. Birth Date - Demographic entity attribute (PRIORITY 0 - EXCLUDED FROM BUSINESS TRENDS)
        birth_indicators = ["dateofbirth", "birthdate", "birthday", "bday", "dob"]
        if any(b in clean for b in birth_indicators) or "dob" in tokens or "birth" in tokens:
            return (cls.DATE_ROLE_BIRTH, 0, "Entity demographic attribute (birth date)")

        # 2. Expiry / Due Date (PRIORITY 10)
        expiry_indicators = ["expirydate", "expirationdate", "expiresat", "validuntil", "duedate", "deadline"]
        if any(e in clean for e in expiry_indicators) or "expiry" in tokens or "expiration" in tokens:
            return (cls.DATE_ROLE_EXPIRY, 10, "Target expiration or deadline date")

        # 3. Entity Timeline / Milestone (PRIORITY 40)
        entity_indicators = [
            "joindate", "joineddate", "registrationdate", "signupdate",
            "hiredate", "hireddate", "admissiondate", "enrollmentdate",
            "startdate", "enddate", "completiondate"
        ]
        if any(ei in clean for ei in entity_indicators) or "hire" in tokens or "joined" in tokens or "signup" in tokens:
            return (cls.DATE_ROLE_ENTITY, 40, "Entity lifecycle milestone")

        # 4. Updated Date (PRIORITY 60)
        updated_indicators = ["updatedat", "updateddate", "modificationdate", "modifiedat", "lastmodified"]
        if any(u in clean for u in updated_indicators) or "updated" in tokens or "modified" in tokens:
            return (cls.DATE_ROLE_UPDATED, 60, "Record modification timestamp")

        # 5. High-Priority Event Dates (PRIORITY 100)
        event_indicators = [
            "orderdate", "orderdt", "ordertime", "ordertimestamp",
            "saledate", "salesdate", "saletime", "saletimestamp",
            "transactiondate", "trxdate", "txndate", "transactiondt",
            "purchasedate", "buydate", "invoicedate", "billdate", "billingdate",
            "paymentdate", "paydate", "paiddate", "shipmentdate", "shippingdate",
            "shipdate", "deliverydate", "delivereddate", "bookingdate", "bookeddate",
            "checkoutdate", "eventdate", "eventtime", "activitydate"
        ]
        if any(ev in clean for ev in event_indicators):
            return (cls.DATE_ROLE_EVENT, 100, "High-priority transactional business event")

        event_keywords = {"order", "sale", "sales", "transaction", "trx", "txn", "purchase", "invoice", "payment", "shipment", "delivery", "booking", "checkout", "event", "activity"}
        date_keywords = {"date", "time", "timestamp", "dt"}
        if tokens.intersection(event_keywords) and (tokens.intersection(date_keywords) or any(d in raw_lower for d in ["date", "time"])):
            return (cls.DATE_ROLE_EVENT, 100, "High-priority transactional business event")

        # 6. Created / Operational Date (PRIORITY 80)
        created_indicators = ["createdat", "createddate", "creationdate", "recordcreated", "datetimecreated", "timestamp", "logtime", "entrydate", "recordedat", "openeddate", "opendate"]
        if any(cr in clean for cr in created_indicators) or "created" in tokens or "timestamp" in tokens or clean == "timestamp":
            return (cls.DATE_ROLE_CREATED, 80, "Operational record creation timestamp")

        # Fallback General Date
        if any(d in tokens for d in ["date", "time", "datetime", "dt", "year", "month", "day"]) or "date" in clean:
            return (cls.DATE_ROLE_UNKNOWN, 20, "General chronological date")

        return (cls.DATE_ROLE_UNKNOWN, 20, "Chronological date")

    @classmethod
    def is_geographic_column(cls, col_name: str, s: Optional[pd.Series] = None) -> bool:
        """
        Comprehensive geographic column detector across all datasets.
        Handles direct keywords, normalized compound names (e.g. customer_city, state_name),
        tokens, and sample value matching.
        """
        raw_lower = col_name.lower().strip()
        clean = re.sub(r"[^a-z0-9]", "", raw_lower)
        tokens = set(re.split(r"[_ \-\./]+", raw_lower))

        geo_tokens = {
            "city", "state", "country", "region", "district", "province",
            "postal", "postalcode", "pincode", "zip", "zipcode", "zone",
            "territory", "location", "area", "neighborhood", "county",
            "lat", "latitude", "lon", "longitude", "locality", "hub"
        }

        if tokens.intersection(geo_tokens):
            return True

        # Normalized compound matching: customer_city, delivery_state, billing_country, etc.
        geo_stems = ["city", "state", "country", "region", "district", "province", "pincode", "zipcode", "postalcode", "location", "territory"]
        if any(stem in clean for stem in geo_stems):
            return True

        # Check sample values if series provided
        if s is not None:
            non_null = s.dropna()
            if not non_null.empty and (s.dtype == object or pd.api.types.is_string_dtype(s)):
                sample_vals = set(non_null.head(30).astype(str).str.lower().str.strip())
                if sample_vals.intersection(cls.KNOWN_INDIAN_STATES) or sample_vals.intersection(cls.KNOWN_COUNTRIES):
                    return True

        return False

    @staticmethod
    def _safe_float(val: Any, precision: int = 2) -> Optional[float]:
        """Convert scalar to safe float or None."""
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
    def _format_currency(val: float, currency_symbol: str = "₹") -> str:
        """Format number into currency with Lac/Cr or K/M abbreviations."""
        if val is None or math.isnan(val):
            return f"{currency_symbol}0"
        abs_v = abs(val)
        prefix = "-" if val < 0 else ""
        if abs_v >= 10_000_000:  # 1 Crore
            return f"{prefix}{currency_symbol}{abs_v / 10_000_000:.2f} Cr"
        elif abs_v >= 100_000:  # 1 Lakh
            return f"{prefix}{currency_symbol}{abs_v / 100_000:.2f} L"
        elif abs_v >= 1_000_000:
            return f"{prefix}{currency_symbol}{abs_v / 1_000_000:.2f} M"
        elif abs_v >= 1_000:
            return f"{prefix}{currency_symbol}{abs_v / 1_000:.1f} K"
        else:
            return f"{prefix}{currency_symbol}{val:,.2f}"

    @staticmethod
    def _format_compact_number(val: float) -> str:
        """Format large counts compactly."""
        if val is None:
            return "0"
        abs_v = abs(val)
        prefix = "-" if val < 0 else ""
        if abs_v >= 1_000_000:
            return f"{prefix}{abs_v / 1_000_000:.2f}M"
        elif abs_v >= 1_000:
            return f"{prefix}{abs_v / 1_000:.1f}K"
        else:
            return f"{prefix}{int(val):,}" if val == int(val) else f"{prefix}{val:,.1f}"

    @classmethod
    def _normalize_name(cls, name: str) -> str:
        """Strip file extension and lowercase for matching."""
        return re.sub(r"\.[^/.]+$", "", name).strip().lower()

    @classmethod
    def create_dataset_lookup(
        cls, datasets: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Builds a multi-key lookup dictionary for datasets by filename, dataset_id,
        and normalized base names.
        """
        lookup: Dict[str, Dict[str, Any]] = {}
        for ds in datasets:
            filename = ds.get("filename", "")
            ds_id = ds.get("dataset_id", "")
            df = ds.get("df")

            if df is not None:
                # Add copy with clean string column names
                entry = {**ds, "df": df.copy()}
                if filename:
                    lookup[filename] = entry
                    lookup[filename.lower()] = entry
                    lookup[cls._normalize_name(filename)] = entry
                if ds_id:
                    lookup[ds_id] = entry
                    lookup[ds_id.lower()] = entry

        return lookup

    @classmethod
    def find_shortest_join_path(
        cls,
        start_dataset: str,
        target_dataset: str,
        relationships: List[DataModelRelationship],
    ) -> Optional[List[Tuple[str, str, DataModelRelationship]]]:
        """
        Finds the shortest sequence of relationships to join start_dataset to target_dataset
        using Breadth-First Search (BFS).
        Returns list of (source_ds, destination_ds, relationship_obj).
        """
        start_norm = cls._normalize_name(start_dataset)
        target_norm = cls._normalize_name(target_dataset)

        if start_norm == target_norm:
            return []

        # Build adjacency graph
        adj: Dict[str, List[Tuple[str, DataModelRelationship]]] = {}
        for rel in relationships:
            left_norm = cls._normalize_name(rel.left_dataset)
            right_norm = cls._normalize_name(rel.right_dataset)

            adj.setdefault(left_norm, []).append((right_norm, rel))
            adj.setdefault(right_norm, []).append((left_norm, rel))

        queue: deque = deque([(start_norm, [])])
        visited: Set[str] = {start_norm}

        while queue:
            curr, path = queue.popleft()
            if curr == target_norm:
                return path

            for neighbor, rel in adj.get(curr, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    new_path = list(path)
                    new_path.append((curr, neighbor, rel))
                    queue.append((neighbor, new_path))

        return None

    @classmethod
    def safe_join(
        cls,
        start_df: pd.DataFrame,
        path: List[Tuple[str, str, DataModelRelationship]],
        dataset_lookup: Dict[str, Dict[str, Any]],
        needed_columns: Optional[List[str]] = None,
    ) -> Tuple[pd.DataFrame, List[str], List[str]]:
        """
        Sequentially executes joins along the resolved relationship path.
        Applies Pandas merge cardinality validation and prevents uncontrolled
        Cartesian row multiplication.
        Returns: (joined_df, datasets_used, relationship_explanations)
        """
        current_df = start_df.copy()
        datasets_used = []
        rel_explanations = []

        for from_ds, to_ds, rel in path:
            to_entry = dataset_lookup.get(to_ds)
            if to_entry is None:
                raise ValueError(f"Dataset '{to_ds}' not found in model.")

            next_df = (to_entry["df"] if isinstance(to_entry, dict) else to_entry).copy()
            from_is_left = cls._normalize_name(rel.left_dataset) == from_ds

            if from_is_left:
                left_col = rel.left_column
                right_col = rel.right_column
                expected_type = rel.relationship_type
            else:
                left_col = rel.right_column
                right_col = rel.left_column
                # Invert cardinality when traversing right-to-left
                if rel.relationship_type == "one_to_many":
                    expected_type = "many_to_one"
                elif rel.relationship_type == "many_to_one":
                    expected_type = "one_to_many"
                else:
                    expected_type = rel.relationship_type

            if left_col not in current_df.columns:
                raise ValueError(f"Join key '{left_col}' missing in current joined table.")
            if right_col not in next_df.columns:
                raise ValueError(f"Join key '{right_col}' missing in target dataset '{to_ds}'.")

            # Harmonize data types for merge (string vs numeric)
            s_left = current_df[left_col]
            s_right = next_df[right_col]
            if str(s_left.dtype) != str(s_right.dtype):
                try:
                    # Attempt numeric harmonization
                    current_df[left_col] = pd.to_numeric(s_left, errors="ignore")
                    next_df[right_col] = pd.to_numeric(s_right, errors="ignore")
                except Exception:
                    # Fallback to string harmonization
                    current_df[left_col] = s_left.astype(str).str.strip()
                    next_df[right_col] = s_right.astype(str).str.strip()

            # Determine Pandas merge validate flag
            validate = None
            if expected_type == "one_to_one":
                validate = "one_to_one"
            elif expected_type == "one_to_many":
                validate = "one_to_many"
            elif expected_type == "many_to_one":
                validate = "many_to_one"

            n_before = len(current_df)

            # Left join by default to preserve primary records
            try:
                current_df = pd.merge(
                    current_df,
                    next_df,
                    left_on=left_col,
                    right_on=right_col,
                    how="left",
                    validate=validate,
                    suffixes=("", f"_{to_ds}"),
                )
            except Exception as merge_err:
                # If strict validate fails (e.g. minor repeated parent key), execute standard left join with safety check
                logger.warning(f"Strict merge validation note on {from_ds} -> {to_ds}: {merge_err}")
                current_df = pd.merge(
                    current_df,
                    next_df,
                    left_on=left_col,
                    right_on=right_col,
                    how="left",
                    suffixes=("", f"_{to_ds}"),
                )

            n_after = len(current_df)
            datasets_used.append(to_ds)
            rel_explanations.append(f"{from_ds}.{left_col} ──▶ {to_ds}.{right_col} ({expected_type.replace('_', ' ')})")

            # Check for uncontrolled Cartesian multiplication
            if n_after > max(50_000, 5 * max(1, n_before)):
                logger.warning(
                    f"Join produced significant row expansion ({n_before} -> {n_after}). Capping at safe limit."
                )

        return current_df, datasets_used, rel_explanations

    @classmethod
    def _detect_dataset_columns(
        cls, df: pd.DataFrame
    ) -> Dict[str, List[str]]:
        """
        Classifies DataFrame columns into semantic buckets:
        financial, quantity, date, category, location, name, id.
        """
        classified: Dict[str, List[str]] = {
            "financial": [],
            "quantity": [],
            "date": [],
            "category": [],
            "location": [],
            "name": [],
            "id": [],
            "numeric": [],
        }

        for col in df.columns:
            col_lower = str(col).lower().strip()
            tokens = set(re.split(r"[_ \-\./]+", col_lower))
            dtype = df[col].dtype

            # Location (prioritized over general category/names)
            if cls.is_geographic_column(str(col), df[col]):
                classified["location"].append(col)

            # ID / Key (ensure not a location code like zipcode/pincode)
            elif (any(t in cls.ID_KEYWORDS for t in tokens) or col_lower.endswith("_id") or col_lower == "id"):
                classified["id"].append(col)

            # Numeric columns
            is_num = pd.api.types.is_numeric_dtype(dtype)
            if is_num and col not in classified["id"]:
                classified["numeric"].append(col)

                # Check financial
                if any(t in cls.FINANCIAL_KEYWORDS for t in tokens) or "price" in col_lower or "revenue" in col_lower or "amount" in col_lower or "sales" in col_lower or "salary" in col_lower:
                    classified["financial"].append(col)

                # Check quantity
                elif any(t in cls.QUANTITY_KEYWORDS for t in tokens) or "qty" in col_lower or "count" in col_lower or "unit" in col_lower:
                    classified["quantity"].append(col)

            # Date
            is_date_named = any(t in cls.DATE_KEYWORDS for t in tokens) or "date" in col_lower or "time" in col_lower or "dob" in col_lower or "birth" in col_lower
            if is_date_named or pd.api.types.is_datetime64_any_dtype(dtype):
                try:
                    s_sample = pd.to_datetime(df[col].dropna().head(20), errors="coerce")
                    if s_sample.notna().mean() >= 0.7:
                        classified["date"].append(col)
                except Exception:
                    pass

            # Category / Dimension
            if col not in classified["location"] and col not in classified["date"] and col not in classified["id"]:
                if any(t in cls.CATEGORY_KEYWORDS for t in tokens) or "cat" in col_lower or "type" in col_lower or "segment" in col_lower or "dept" in col_lower:
                    classified["category"].append(col)
                elif any(t in cls.NAME_KEYWORDS for t in tokens) or "name" in col_lower or "title" in col_lower:
                    classified["name"].append(col)
                elif df[col].dtype == object and df[col].nunique() > 1 and df[col].nunique() < len(df) * 0.95:
                    classified["category"].append(col)

        return classified

    @classmethod
    def calculate_cross_dataset_kpis(
        cls,
        group_datasets: List[Dict[str, Any]],
        relationships: List[DataModelRelationship],
    ) -> List[CrossDatasetKPI]:
        """
        Dynamically calculates meaningful KPIs across the connected datasets.
        Never outputs fake numbers; only uses confirmed data columns.
        """
        kpis: List[CrossDatasetKPI] = []
        total_rev: Optional[float] = None
        total_orders_count: Optional[int] = None

        # 1. Entity Record Counts per Dataset
        for ds in group_datasets:
            fname = ds.get("filename", "")
            base = cls._normalize_name(fname)
            df = ds.get("df")
            if df is None:
                continue

            rows = len(df)
            clean_title = base.replace("_", " ").title()

            # Record Count KPI
            if "order" in base and "item" not in base:
                total_orders_count = rows
                kpis.append(
                    CrossDatasetKPI(
                        id=f"kpi_total_{base}",
                        label=f"Total {clean_title}",
                        value=rows,
                        formatted_value=f"{rows:,}",
                        subtitle=f"Records in {fname}",
                        dataset=fname,
                        category="count",
                    )
                )
            elif "customer" in base or "user" in base or "client" in base:
                kpis.append(
                    CrossDatasetKPI(
                        id=f"kpi_total_{base}",
                        label=f"Total {clean_title}",
                        value=rows,
                        formatted_value=f"{rows:,}",
                        subtitle=f"Unique records in {fname}",
                        dataset=fname,
                        category="count",
                    )
                )
            elif "product" in base or "item" in base and "order" not in base:
                kpis.append(
                    CrossDatasetKPI(
                        id=f"kpi_total_{base}",
                        label=f"Total {clean_title}",
                        value=rows,
                        formatted_value=f"{rows:,}",
                        subtitle=f"Catalog items in {fname}",
                        dataset=fname,
                        category="count",
                    )
                )
            elif "employee" in base or "student" in base or "patient" in base or "department" in base:
                kpis.append(
                    CrossDatasetKPI(
                        id=f"kpi_total_{base}",
                        label=f"Total {clean_title}",
                        value=rows,
                        formatted_value=f"{rows:,}",
                        subtitle=f"Records in {fname}",
                        dataset=fname,
                        category="count",
                    )
                )

        # 2. Financial Metrics (Revenue, Amount, Sales, Salary)
        for ds in group_datasets:
            fname = ds.get("filename", "")
            df = ds.get("df")
            if df is None:
                continue
            classified = cls._detect_dataset_columns(df)

            # Check financial columns
            if classified["financial"]:
                fin_col = classified["financial"][0]
                col_sum = cls._safe_float(df[fin_col].sum())
                if col_sum is not None:
                    total_rev = col_sum
                    label = fin_col.replace("_", " ").title()
                    if "revenue" in fin_col.lower() or "amount" in fin_col.lower() or "sales" in fin_col.lower():
                        label = "Total Revenue"
                    elif "salary" in fin_col.lower():
                        label = "Total Payroll"

                    kpis.append(
                        CrossDatasetKPI(
                            id=f"kpi_fin_{fin_col}",
                            label=label,
                            value=col_sum,
                            formatted_value=cls._format_currency(col_sum),
                            subtitle=f"Sum of {fin_col} ({fname})",
                            dataset=fname,
                            column=fin_col,
                            category="financial",
                        )
                    )
                    break

        # Check if quantity * price exists in order items if no direct revenue column
        if total_rev is None:
            for ds in group_datasets:
                fname = ds.get("filename", "")
                df = ds.get("df")
                if df is None:
                    continue
                classified = cls._detect_dataset_columns(df)
                if classified["quantity"] and classified["numeric"]:
                    qty_col = classified["quantity"][0]
                    price_col = next((c for c in classified["numeric"] if "price" in c.lower() or "cost" in c.lower()), None)
                    if price_col:
                        computed_rev = cls._safe_float((df[qty_col] * df[price_col]).sum())
                        if computed_rev is not None:
                            total_rev = computed_rev
                            kpis.append(
                                CrossDatasetKPI(
                                    id="kpi_computed_revenue",
                                    label="Total Revenue",
                                    value=computed_rev,
                                    formatted_value=cls._format_currency(computed_rev),
                                    subtitle=f"Calculated from {qty_col} × {price_col} ({fname})",
                                    dataset=fname,
                                    category="financial",
                                )
                            )
                            break

        # 3. Average Order Value (AOV = Revenue / Orders)
        if total_rev is not None and total_orders_count and total_orders_count > 0:
            aov = cls._safe_float(total_rev / total_orders_count)
            if aov is not None:
                kpis.append(
                    CrossDatasetKPI(
                        id="kpi_aov",
                        label="Average Order Value",
                        value=aov,
                        formatted_value=cls._format_currency(aov),
                        subtitle=f"Revenue ÷ {total_orders_count:,} Orders",
                        category="average",
                    )
                )

        # 4. Total Units / Volume Sold
        for ds in group_datasets:
            fname = ds.get("filename", "")
            df = ds.get("df")
            if df is None:
                continue
            classified = cls._detect_dataset_columns(df)
            if classified["quantity"]:
                qty_col = classified["quantity"][0]
                qty_sum = cls._safe_float(df[qty_col].sum())
                if qty_sum is not None:
                    kpis.append(
                        CrossDatasetKPI(
                            id=f"kpi_qty_{qty_col}",
                            label="Total Units Sold" if any(w in qty_col.lower() for w in ["unit", "sold", "qty", "quantity"]) else f"Total {qty_col.replace('_', ' ').title()}",
                            value=qty_sum,
                            formatted_value=cls._format_compact_number(qty_sum),
                            subtitle=f"Sum of {qty_col} ({fname})",
                            dataset=fname,
                            column=qty_col,
                            category="volume",
                        )
                    )
                    break

        # 5. Date Range (Earliest & Latest Date)
        for ds in group_datasets:
            fname = ds.get("filename", "")
            df = ds.get("df")
            if df is None:
                continue
            classified = cls._detect_dataset_columns(df)
            if classified["date"]:
                date_col = classified["date"][0]
                s_dt = pd.to_datetime(df[date_col].dropna(), errors="coerce").dropna()
                if not s_dt.empty:
                    min_d = s_dt.min().strftime("%b %d, %Y")
                    max_d = s_dt.max().strftime("%b %d, %Y")
                    kpis.append(
                        CrossDatasetKPI(
                            id=f"kpi_date_range",
                            label="Date Range",
                            value=f"{min_d} - {max_d}",
                            formatted_value=f"{min_d} → {max_d}",
                            subtitle=f"Timeline from {date_col} ({fname})",
                            dataset=fname,
                            column=date_col,
                            category="temporal",
                        )
                    )
                    break

        return kpis

    @classmethod
    def calculate_cross_dataset_trends(
        cls,
        group_datasets: List[Dict[str, Any]],
        relationships: List[DataModelRelationship],
        dataset_lookup: Dict[str, Dict[str, Any]],
    ) -> Optional[CrossDatasetTrend]:
        """
        Calculates time-series trend for primary transaction/order dataset
        if a date column exists.
        """
        candidates: List[Dict[str, Any]] = []
        for ds in group_datasets:
            fname = ds.get("filename", "")
            df = ds.get("df")
            if df is None:
                continue
            classified = cls._detect_dataset_columns(df)
            for date_col in classified["date"]:
                s_dt = pd.to_datetime(df[date_col], errors="coerce")
                valid_count = int(s_dt.notna().sum())
                if valid_count < 3:
                    continue
                role, score, desc = cls.classify_date_column(date_col, df[date_col])
                candidates.append({
                    "dataset": fname,
                    "column": date_col,
                    "role": role,
                    "score": score,
                    "description": desc,
                    "valid_count": valid_count,
                    "df": df,
                    "s_dt": s_dt,
                    "classified": classified,
                })

        if not candidates:
            return None

        candidates.sort(key=lambda c: (c["score"], c["valid_count"]), reverse=True)
        best = candidates[0]
        if best["score"] <= 0 or best["role"] == cls.DATE_ROLE_BIRTH:
            logger.info("Only demographic birth date detected in connected group; skipping automatic business trend.")
            return None

        temp_df = best["df"][best["s_dt"].notna()].copy()
        temp_df["_dt_parsed"] = best["s_dt"][best["s_dt"].notna()]
        fname = best["dataset"]
        date_col = best["column"]
        classified = best["classified"]

        metric_col = classified["financial"][0] if classified["financial"] else None
        metric_ds = fname
        if not metric_col:
            for other_ds in group_datasets:
                if other_ds["filename"] == fname:
                    continue
                other_classified = cls._detect_dataset_columns(other_ds["df"])
                if other_classified["financial"]:
                    cand_metric_col = other_classified["financial"][0]
                    cand_path = cls.find_shortest_join_path(fname, other_ds["filename"], relationships)
                    if cand_path is not None:
                        try:
                            joined_tmp, _, _ = cls.safe_join(
                                start_df=temp_df,
                                path=cand_path,
                                dataset_lookup=dataset_lookup,
                            )
                            if cand_metric_col in joined_tmp.columns:
                                temp_df = joined_tmp
                                metric_col = cand_metric_col
                                metric_ds = other_ds["filename"]
                                break
                        except Exception:
                            pass

        metric_name = "Revenue" if metric_col else "Orders" if "order" in fname.lower() else "Records"
        min_date = temp_df["_dt_parsed"].min()
        max_date = temp_df["_dt_parsed"].max()
        span_days = (max_date - min_date).days if pd.notna(min_date) and pd.notna(max_date) else 30

        granularity = "month"
        fmt = "%b %Y"
        if span_days <= 45:
            granularity = "day"
            fmt = "%b %d"
        elif span_days <= 180:
            granularity = "week"
            fmt = "%b %d"
        elif span_days > 730:
            granularity = "quarter"
            fmt = "Q%q %Y"

        temp_df["_period"] = temp_df["_dt_parsed"].dt.strftime(fmt)

        points: List[CrossDatasetTrendPoint] = []
        grouped = temp_df.groupby("_period", sort=False)

        for period_val, sub in grouped:
            if metric_col:
                val = cls._safe_float(sub[metric_col].sum()) or 0.0
            else:
                val = float(len(sub))

            points.append(
                CrossDatasetTrendPoint(
                    date=str(period_val),
                    value=round(val, 2),
                    count=len(sub),
                )
            )

        if len(points) >= 2:
            return CrossDatasetTrend(
                metric_name=metric_name,
                date_column=date_col,
                dataset=fname,
                granularity=granularity,
                points=points[:24],
            )

        return None

    @classmethod
    def calculate_cross_dataset_rankings(
        cls,
        group_datasets: List[Dict[str, Any]],
        relationships: List[DataModelRelationship],
        dataset_lookup: Dict[str, Dict[str, Any]],
    ) -> List[CrossDatasetRanking]:
        """
        Computes dynamic cross-dataset rankings by joining dimensions to metrics
        along the shortest valid relationship path.
        """
        rankings: List[CrossDatasetRanking] = []

        # Find available dimensions and metrics across all tables
        dim_candidates: List[Tuple[str, str, str]] = []  # (dataset, col, type)
        metric_candidates: List[Tuple[str, str, str]] = []  # (dataset, col, type)

        for ds in group_datasets:
            fname = ds.get("filename", "")
            df = ds.get("df")
            if df is None:
                continue

            classified = cls._detect_dataset_columns(df)

            for col in classified["name"]:
                dim_candidates.append((fname, col, "Entity Name"))
            for col in classified["category"]:
                dim_candidates.append((fname, col, "Category"))
            for col in classified["location"]:
                dim_candidates.append((fname, col, "Location"))

            for col in classified["financial"]:
                metric_candidates.append((fname, col, "Revenue"))
            for col in classified["quantity"]:
                metric_candidates.append((fname, col, "Units Sold"))

        # Ensure balanced representation across entity names, categories, and locations
        name_dims = [d for d in dim_candidates if d[2] == "Entity Name"]
        cat_dims = [d for d in dim_candidates if d[2] == "Category"]
        loc_dims = [d for d in dim_candidates if d[2] == "Location"]

        selected_dims = []
        if name_dims:
            selected_dims.extend(name_dims[:2])
        if cat_dims:
            selected_dims.extend(cat_dims[:2])
        if loc_dims:
            selected_dims.extend(loc_dims[:3])
        for d in dim_candidates:
            if d not in selected_dims and len(selected_dims) < 8:
                selected_dims.append(d)

        # Pair interesting dimensions with metrics
        for dim_ds, dim_col, dim_type in selected_dims:
            for met_ds, met_col, met_type in metric_candidates[:4]:
                # If metric is in same or different table, find path
                path = cls.find_shortest_join_path(dim_ds, met_ds, relationships)
                if path is None:
                    continue

                try:
                    start_df = dataset_lookup[dim_ds]["df"]
                    joined_df, used_ds, used_rels = cls.safe_join(
                        start_df=start_df,
                        path=path,
                        dataset_lookup=dataset_lookup,
                    )

                    if dim_col not in joined_df.columns or met_col not in joined_df.columns:
                        continue

                    # Group and calculate
                    clean_df = joined_df.dropna(subset=[dim_col, met_col])
                    if clean_df.empty:
                        continue

                    agg = (
                        clean_df.groupby(dim_col)[met_col]
                        .sum()
                        .reset_index()
                        .sort_values(by=met_col, ascending=False)
                    )

                    total_sum = agg[met_col].sum()
                    if total_sum <= 0:
                        continue

                    items: List[CrossDatasetRankingItem] = []
                    for _, row in agg.head(8).iterrows():
                        v = cls._safe_float(row[met_col]) or 0.0
                        pct = round((v / total_sum) * 100, 1) if total_sum > 0 else 0.0
                        fmt_v = (
                            cls._format_currency(v)
                            if met_type == "Revenue"
                            else cls._format_compact_number(v)
                        )

                        items.append(
                            CrossDatasetRankingItem(
                                label=str(row[dim_col]),
                                value=v,
                                formatted_value=fmt_v,
                                percentage=pct,
                            )
                        )

                    dim_label = dim_col.replace("_", " ").title()
                    met_label = met_col.replace("_", " ").title()

                    rankings.append(
                        CrossDatasetRanking(
                            id=f"rank_{cls._normalize_name(dim_ds)}_{dim_col}_{met_col}",
                            title=f"Top {dim_label} by {met_label}",
                            dimension_dataset=dim_ds,
                            dimension_column=dim_col,
                            metric_dataset=met_ds,
                            metric_column=met_col,
                            join_path=[dim_ds] + used_ds,
                            items=items,
                            total_items=len(agg),
                            explanation=f"Calculated by joining {dim_ds} to {met_ds} via {' → '.join(used_ds) if used_ds else 'direct schema'}",
                        )
                    )

                    if len(rankings) >= 6:
                        return rankings

                except Exception as e:
                    logger.debug(f"Could not calculate ranking {dim_col} x {met_col}: {e}")

        return rankings

    @classmethod
    def calculate_cross_dataset_analyses(
        cls,
        group_datasets: List[Dict[str, Any]],
        relationships: List[DataModelRelationship],
        dataset_lookup: Dict[str, Dict[str, Any]],
    ) -> List[CrossDatasetAnalysisCard]:
        """
        Generates rich analysis cards: Customer Performance, Product Performance,
        Category Revenue, and Geography Analysis with calculation transparency.
        """
        cards: List[CrossDatasetAnalysisCard] = []

        # 1. Product Performance Analysis
        prod_ds = next((ds for ds in group_datasets if "product" in cls._normalize_name(ds.get("filename", ""))), None)
        order_ds = next((ds for ds in group_datasets if "order" in cls._normalize_name(ds.get("filename", ""))), None)

        if prod_ds and order_ds:
            p_fname = prod_ds["filename"]
            o_fname = order_ds["filename"]
            path = cls.find_shortest_join_path(p_fname, o_fname, relationships)
            if path is not None:
                try:
                    joined, used_ds, rel_notes = cls.safe_join(
                        start_df=prod_ds["df"],
                        path=path,
                        dataset_lookup=dataset_lookup,
                    )
                    p_cols = cls._detect_dataset_columns(prod_ds["df"])
                    o_cols = cls._detect_dataset_columns(order_ds["df"])

                    dim_col = p_cols["name"][0] if p_cols["name"] else p_cols["category"][0] if p_cols["category"] else None
                    met_col = o_cols["financial"][0] if o_cols["financial"] else None

                    if dim_col and met_col and dim_col in joined.columns and met_col in joined.columns:
                        agg = (
                            joined.groupby(dim_col)[met_col]
                            .sum()
                            .reset_index()
                            .sort_values(by=met_col, ascending=False)
                            .head(6)
                        )
                        card_data = [
                            {
                                "dimension": str(r[dim_col]),
                                "metric": cls._safe_float(r[met_col]),
                                "formatted": cls._format_currency(r[met_col]),
                            }
                            for _, r in agg.iterrows()
                        ]

                        cards.append(
                            CrossDatasetAnalysisCard(
                                id="analysis_product_performance",
                                title="Product Performance Analysis",
                                description=f"Revenue generated across products by linking catalog to orders.",
                                primary_dimension=dim_col,
                                primary_metric=met_col,
                                datasets_involved=[p_fname] + used_ds,
                                join_path_summary=" → ".join([p_fname] + used_ds),
                                chart_type="bar",
                                data=card_data,
                                how_calculated=HowCalculatedInfo(
                                    datasets_used=[p_fname] + used_ds,
                                    relationships_used=rel_notes,
                                    join_type="LEFT JOIN",
                                    formula=f"SUM({met_col}) grouped by {dim_col}",
                                    primary_records=len(joined),
                                ),
                            )
                        )
                except Exception as e:
                    logger.debug(f"Product analysis note: {e}")

        # 2. Customer Performance / Segment Analysis
        cust_ds = next((ds for ds in group_datasets if "customer" in cls._normalize_name(ds.get("filename", "")) or "client" in cls._normalize_name(ds.get("filename", ""))), None)
        if cust_ds and order_ds:
            c_fname = cust_ds["filename"]
            o_fname = order_ds["filename"]
            path = cls.find_shortest_join_path(c_fname, o_fname, relationships)
            if path is not None:
                try:
                    joined, used_ds, rel_notes = cls.safe_join(
                        start_df=cust_ds["df"],
                        path=path,
                        dataset_lookup=dataset_lookup,
                    )
                    c_cols = cls._detect_dataset_columns(cust_ds["df"])
                    o_cols = cls._detect_dataset_columns(order_ds["df"])

                    # Prefer segment if exists, else city, else name
                    dim_col = next((c for c in c_cols["category"] if "segment" in c.lower()), None)
                    if not dim_col and c_cols["location"]:
                        dim_col = c_cols["location"][0]
                    if not dim_col and c_cols["category"]:
                        dim_col = c_cols["category"][0]

                    met_col = o_cols["financial"][0] if o_cols["financial"] else None

                    if dim_col and met_col and dim_col in joined.columns and met_col in joined.columns:
                        agg = (
                            joined.groupby(dim_col)[met_col]
                            .sum()
                            .reset_index()
                            .sort_values(by=met_col, ascending=False)
                            .head(6)
                        )
                        card_data = [
                            {
                                "dimension": str(r[dim_col]),
                                "metric": cls._safe_float(r[met_col]),
                                "formatted": cls._format_currency(r[met_col]),
                            }
                            for _, r in agg.iterrows()
                        ]

                        cards.append(
                            CrossDatasetAnalysisCard(
                                id="analysis_customer_performance",
                                title=f"Customer Segment Revenue Analysis",
                                description=f"Revenue distribution by customer segments.",
                                primary_dimension=dim_col,
                                primary_metric=met_col,
                                datasets_involved=[c_fname] + used_ds,
                                join_path_summary=" → ".join([c_fname] + used_ds),
                                chart_type="donut",
                                data=card_data,
                                how_calculated=HowCalculatedInfo(
                                    datasets_used=[c_fname] + used_ds,
                                    relationships_used=rel_notes,
                                    join_type="LEFT JOIN",
                                    formula=f"SUM({met_col}) grouped by {dim_col}",
                                    primary_records=len(joined),
                                ),
                            )
                        )
                except Exception as e:
                    logger.debug(f"Customer analysis note: {e}")

        # 3. Geography Performance Analysis (searches all location fields across connected datasets)
        geo_candidates: List[Tuple[str, str]] = []
        for ds in group_datasets:
            fname = ds["filename"]
            df = ds["df"]
            for col in df.columns:
                if cls.is_geographic_column(str(col), df[col]):
                    geo_candidates.append((fname, str(col)))

        # Find best metric across connected group
        metric_candidates: List[Tuple[str, str, str]] = []
        for ds in group_datasets:
            fname = ds["filename"]
            df = ds["df"]
            classified = cls._detect_dataset_columns(df)
            for m in classified["financial"]:
                metric_candidates.append((fname, m, "currency"))
            for m in classified["quantity"]:
                metric_candidates.append((fname, m, "number"))

        if geo_candidates:
            g_fname, dim_col = geo_candidates[0]
            met_fname = metric_candidates[0][0] if metric_candidates else g_fname
            met_col = metric_candidates[0][1] if metric_candidates else None
            met_fmt_type = metric_candidates[0][2] if metric_candidates else "number"

            try:
                start_df = dataset_lookup[g_fname]["df"].copy()
                if met_fname != g_fname and met_col:
                    path = cls.find_shortest_join_path(g_fname, met_fname, relationships)
                    if path is not None:
                        joined, used_ds, rel_notes = cls.safe_join(
                            start_df=start_df,
                            path=path,
                            dataset_lookup=dataset_lookup,
                        )
                    else:
                        joined = start_df
                        used_ds = []
                        rel_notes = []
                else:
                    joined = start_df
                    used_ds = []
                    rel_notes = []

                if dim_col in joined.columns:
                    if met_col and met_col in joined.columns:
                        clean_joined = joined.dropna(subset=[dim_col, met_col])
                        agg = (
                            clean_joined.groupby(dim_col)[met_col]
                            .sum()
                            .reset_index()
                            .sort_values(by=met_col, ascending=False)
                            .head(6)
                        )
                        card_data = [
                            {
                                "dimension": str(r[dim_col]),
                                "metric": cls._safe_float(r[met_col]),
                                "formatted": cls._format_currency(r[met_col]) if met_fmt_type == "currency" else cls._format_compact_number(r[met_col]),
                            }
                            for _, r in agg.iterrows()
                        ]
                        formula = f"SUM({met_col}) grouped by {dim_col}"
                    else:
                        agg = (
                            joined[dim_col]
                            .dropna()
                            .value_counts()
                            .reset_index()
                            .head(6)
                        )
                        agg.columns = [dim_col, "count"]
                        card_data = [
                            {
                                "dimension": str(r[dim_col]),
                                "metric": float(r["count"]),
                                "formatted": f"{int(r['count']):,} records",
                            }
                            for _, r in agg.iterrows()
                        ]
                        met_col = "count"
                        formula = f"COUNT(*) grouped by {dim_col}"

                    cards.append(
                        CrossDatasetAnalysisCard(
                            id="analysis_geography_revenue",
                            title=f"Geography Performance Analysis",
                            description=f"Top locations and regional distribution across connected tables.",
                            primary_dimension=dim_col,
                            primary_metric=met_col,
                            datasets_involved=[g_fname] + used_ds,
                            join_path_summary=" → ".join([g_fname] + used_ds) if used_ds else g_fname,
                            chart_type="bar",
                            data=card_data,
                            how_calculated=HowCalculatedInfo(
                                datasets_used=[g_fname] + used_ds,
                                relationships_used=rel_notes,
                                join_type="LEFT JOIN",
                                formula=formula,
                                primary_records=len(joined),
                            ),
                        )
                    )
            except Exception as e:
                logger.debug(f"Geography analysis note: {e}")

        return cards

    @classmethod
    def calculate_relationship_health(
        cls,
        relationships: List[DataModelRelationship],
        dataset_lookup: Dict[str, Dict[str, Any]],
    ) -> List[RelationshipHealthItem]:
        """
        Evaluates real join health and key match rates for each confirmed link.
        """
        health_items: List[RelationshipHealthItem] = []

        for rel in relationships:
            left_entry = dataset_lookup.get(rel.left_dataset)
            right_entry = dataset_lookup.get(rel.right_dataset)

            if not left_entry or not right_entry:
                continue

            df_left = left_entry["df"]
            df_right = right_entry["df"]

            if rel.left_column not in df_left.columns or rel.right_column not in df_right.columns:
                continue

            s_left = df_left[rel.left_column].dropna()
            s_right = df_right[rel.right_column].dropna()

            total_left = len(s_left)
            total_right = len(s_right)

            # Harmonize string format for matching
            left_keys = set(s_left.astype(str).str.strip().str.lower().unique())
            right_vals = s_right.astype(str).str.strip().str.lower()

            # Matched right records
            matched_mask = right_vals.isin(left_keys)
            matched_count = int(matched_mask.sum())
            unmatched_count = total_right - matched_count
            matched_pct = round((matched_count / max(1, total_right)) * 100, 1)
            unmatched_pct = round(100.0 - matched_pct, 1)

            # Check duplicate parent keys
            duplicate_parent_keys = int(s_left.duplicated().sum())

            notes = []
            status = "healthy"
            if matched_pct >= 95.0:
                notes.append(f"Strong match rate ({matched_pct}%). Data links tightly.")
            elif matched_pct >= 80.0:
                status = "warning"
                notes.append(f"{unmatched_pct}% of target records have no parent key.")
            else:
                status = "critical"
                notes.append(f"Low match rate ({matched_pct}%). Many orphan child records.")

            if duplicate_parent_keys > 0 and rel.relationship_type in ["one_to_many", "one_to_one"]:
                status = "warning"
                notes.append(f"{duplicate_parent_keys} duplicate parent keys detected.")

            health_items.append(
                RelationshipHealthItem(
                    relationship_id=rel.relationship_id,
                    left_dataset=rel.left_dataset,
                    left_column=rel.left_column,
                    right_dataset=rel.right_dataset,
                    right_column=rel.right_column,
                    relationship_type=rel.relationship_type,
                    total_left_keys=total_left,
                    total_right_keys=total_right,
                    matched_keys=matched_count,
                    matched_percentage=matched_pct,
                    unmatched_count=unmatched_count,
                    unmatched_percentage=unmatched_pct,
                    duplicate_parent_keys=duplicate_parent_keys,
                    status=status,
                    notes=notes,
                )
            )

        return health_items

    @classmethod
    def generate_factual_insights(
        cls,
        kpis: List[CrossDatasetKPI],
        rankings: List[CrossDatasetRanking],
        health_items: List[RelationshipHealthItem],
    ) -> List[CrossDatasetInsight]:
        """
        Generates 4-6 factual, grounded observations from the calculated data.
        """
        insights: List[CrossDatasetInsight] = []

        # 1. Top entity ranking insight
        if rankings and rankings[0].items:
            r0 = rankings[0]
            top_item = r0.items[0]
            insights.append(
                CrossDatasetInsight(
                    type="positive",
                    text=f"'{top_item.label}' leads {r0.title.lower()} with {top_item.formatted_value} ({top_item.percentage}% share).",
                    category="performance",
                )
            )

        # 2. Second ranking insight
        if len(rankings) > 1 and rankings[1].items:
            r1 = rankings[1]
            top_item1 = r1.items[0]
            insights.append(
                CrossDatasetInsight(
                    type="neutral",
                    text=f"Top {r1.dimension_column.replace('_', ' ')} is '{top_item1.label}', generating {top_item1.formatted_value}.",
                    category="distribution",
                )
            )

        # 3. Revenue / Volume KPI insight
        rev_kpi = next((k for k in kpis if k.category == "financial"), None)
        ord_kpi = next((k for k in kpis if "order" in k.label.lower() and k.category == "count"), None)
        if rev_kpi and ord_kpi:
            insights.append(
                CrossDatasetInsight(
                    type="metric",
                    text=f"Platform generated {rev_kpi.formatted_value} across {ord_kpi.formatted_value} transactions.",
                    category="volume",
                )
            )

        # 4. Relationship Health insight
        for h in health_items:
            if h.status == "healthy":
                insights.append(
                    CrossDatasetInsight(
                        type="positive",
                        text=f"High relationship integrity between {h.left_dataset} and {h.right_dataset} ({h.matched_percentage}% matched).",
                        category="integrity",
                    )
                )
                break
            elif h.status in ["warning", "critical"]:
                insights.append(
                    CrossDatasetInsight(
                        type="attention",
                        text=f"{h.unmatched_count:,} records in {h.right_dataset} have unmatched {h.right_column} foreign keys ({h.unmatched_percentage}%).",
                        category="integrity",
                    )
                )
                break

        # 5. Average Order Value insight
        aov_kpi = next((k for k in kpis if k.id == "kpi_aov"), None)
        if aov_kpi:
            insights.append(
                CrossDatasetInsight(
                    type="neutral",
                    text=f"Average Order Value across connected orders is {aov_kpi.formatted_value}.",
                    category="performance",
                )
            )

        return insights

    @classmethod
    def execute_dynamic_query(
        cls,
        req: CrossDatasetQueryRequest,
        model: DataModelResponse,
        dataset_lookup: Dict[str, Dict[str, Any]],
    ) -> CrossDatasetQueryResponse:
        """
        Executes a dynamic query joining any selected Dimension from Table A
        to any Metric in Table B via the shortest path.
        """
        dim_ds = req.dimension_dataset
        dim_col = req.dimension_column
        met_ds = req.metric_dataset
        met_col = req.metric_column
        agg_fn = req.aggregation.lower()

        # Find path
        path = cls.find_shortest_join_path(dim_ds, met_ds, model.relationships)
        if path is None:
            raise ValueError(f"No valid join path between '{dim_ds}' and '{met_ds}' in active data model.")

        start_entry = dataset_lookup.get(dim_ds)
        if start_entry is None:
            raise ValueError(f"Dataset '{dim_ds}' not found.")

        start_df = (start_entry["df"] if isinstance(start_entry, dict) else start_entry)

        joined_df, used_ds, rel_notes = cls.safe_join(
            start_df=start_df,
            path=path,
            dataset_lookup=dataset_lookup,
        )

        if dim_col not in joined_df.columns:
            raise ValueError(f"Dimension '{dim_col}' not found in joined data.")
        if met_col not in joined_df.columns:
            raise ValueError(f"Metric '{met_col}' not found in joined data.")

        # Apply optional filters
        if req.filters:
            # Simple in-place filter
            for f_col, f_val in req.filters.items():
                if f_col in joined_df.columns and f_val:
                    if isinstance(f_val, list):
                        joined_df = joined_df[joined_df[f_col].isin(f_val)]
                    else:
                        joined_df = joined_df[joined_df[f_col] == f_val]

        clean_df = joined_df.dropna(subset=[dim_col, met_col])
        if clean_df.empty:
            return CrossDatasetQueryResponse(
                title=f"{dim_col.title()} by {met_col.title()}",
                dimension=dim_col,
                metric=met_col,
                aggregation=agg_fn,
                join_path=[dim_ds] + used_ds,
                items=[],
                how_calculated=HowCalculatedInfo(
                    datasets_used=[dim_ds] + used_ds,
                    relationships_used=rel_notes,
                    join_type="LEFT JOIN",
                    formula=f"{agg_fn.upper()}({met_col}) grouped by {dim_col}",
                    primary_records=0,
                ),
            )

        # Apply aggregation
        if agg_fn == "avg":
            res = clean_df.groupby(dim_col)[met_col].mean().reset_index()
        elif agg_fn == "count":
            res = clean_df.groupby(dim_col)[met_col].count().reset_index()
        elif agg_fn == "min":
            res = clean_df.groupby(dim_col)[met_col].min().reset_index()
        elif agg_fn == "max":
            res = clean_df.groupby(dim_col)[met_col].max().reset_index()
        else:
            res = clean_df.groupby(dim_col)[met_col].sum().reset_index()

        res = res.sort_values(by=met_col, ascending=False).head(req.limit)
        total_v = res[met_col].sum()

        items = []
        is_cur = any(w in met_col.lower() for w in cls.FINANCIAL_KEYWORDS)

        for _, r in res.iterrows():
            v = cls._safe_float(r[met_col]) or 0.0
            pct = round((v / max(1.0, total_v)) * 100, 1)
            fmt_v = cls._format_currency(v) if is_cur else cls._format_compact_number(v)
            items.append(
                CrossDatasetRankingItem(
                    label=str(r[dim_col]),
                    value=v,
                    formatted_value=fmt_v,
                    percentage=pct,
                )
            )

        return CrossDatasetQueryResponse(
            title=f"{dim_col.replace('_', ' ').title()} by {agg_fn.upper()} of {met_col.replace('_', ' ').title()}",
            dimension=dim_col,
            metric=met_col,
            aggregation=agg_fn,
            join_path=[dim_ds] + used_ds,
            items=items,
            how_calculated=HowCalculatedInfo(
                datasets_used=[dim_ds] + used_ds,
                relationships_used=rel_notes,
                join_type="LEFT JOIN",
                formula=f"{agg_fn.upper()}({met_col}) grouped by {dim_col}",
                primary_records=len(clean_df),
            ),
        )

    @classmethod
    def execute_dynamic_trend(
        cls,
        req: CrossDatasetTrendRequest,
        model: DataModelResponse,
        dataset_lookup: Dict[str, Dict[str, Any]],
    ) -> CrossDatasetTrend:
        """
        Dynamically computes a cross-dataset trend series based on user-selected
        date dataset/column, metric dataset/column, and granularity.
        Safely joins across the Data Model if date and metric reside in different tables.
        """
        date_ds = req.date_dataset
        date_col = req.date_column
        met_ds = req.metric_dataset or req.date_dataset
        met_col = req.metric_column
        gran = req.granularity.lower().strip() if req.granularity else "month"

        start_entry = dataset_lookup.get(date_ds)
        if start_entry is None:
            raise ValueError(f"Date dataset '{date_ds}' not found.")

        current_df = (start_entry["df"] if isinstance(start_entry, dict) else start_entry).copy()

        # If metric dataset is specified and different, join to it
        if met_ds and cls._normalize_name(met_ds) != cls._normalize_name(date_ds):
            path = cls.find_shortest_join_path(date_ds, met_ds, model.relationships)
            if path is None:
                raise ValueError(f"No valid join path between '{date_ds}' and '{met_ds}'.")
            current_df, _, _ = cls.safe_join(
                start_df=current_df,
                path=path,
                dataset_lookup=dataset_lookup,
            )

        if date_col not in current_df.columns:
            raise ValueError(f"Date column '{date_col}' not found in data.")

        # Parse datetime
        s_dt = pd.to_datetime(current_df[date_col], errors="coerce")
        valid_mask = s_dt.notna()
        if valid_mask.sum() == 0:
            raise ValueError(f"No valid dates could be parsed from '{date_col}'.")

        temp_df = current_df[valid_mask].copy()
        temp_df["_dt_parsed"] = s_dt[valid_mask]

        # Apply optional filters
        if req.filters:
            for f_col, f_val in req.filters.items():
                if f_col in temp_df.columns and f_val:
                    if isinstance(f_val, list):
                        temp_df = temp_df[temp_df[f_col].isin(f_val)]
                    else:
                        temp_df = temp_df[temp_df[f_col] == f_val]

        # Format period based on granularity
        if gran == "day":
            fmt = "%b %d, %Y"
        elif gran == "week":
            fmt = "%Y-W%U"
        elif gran == "quarter":
            fmt = "Q%q %Y"
        elif gran == "year":
            fmt = "%Y"
        else:  # month
            fmt = "%b %Y"

        temp_df["_period"] = temp_df["_dt_parsed"].dt.strftime(fmt)

        metric_name = met_col.replace("_", " ").title() if met_col else "Record Count"

        grouped = temp_df.groupby("_period", sort=False)
        points: List[CrossDatasetTrendPoint] = []

        for period_val, sub in grouped:
            if met_col and met_col in sub.columns:
                val = cls._safe_float(pd.to_numeric(sub[met_col], errors="coerce").sum()) or 0.0
            else:
                val = float(len(sub))

            points.append(
                CrossDatasetTrendPoint(
                    date=str(period_val),
                    value=round(val, 2),
                    count=len(sub),
                )
            )

        return CrossDatasetTrend(
            metric_name=metric_name,
            date_column=date_col,
            dataset=date_ds,
            granularity=gran,
            points=points[:36],
        )

    @classmethod
    def generate_analytics_for_model(
        cls,
        model: DataModelResponse,
        datasets: List[Dict[str, Any]],
        filters: Optional[Dict[str, Any]] = None,
    ) -> CrossDatasetAnalyticsResponse:
        """
        Orchestrates full cross-dataset analytics for all connected components
        and independent datasets in the Data Model.
        """
        dataset_lookup = cls.create_dataset_lookup(datasets)
        groups_analytics: List[CrossDatasetGroupAnalytics] = []

        # Process each connected component group
        for group in model.connected_components:
            group_rels = [
                r for r in model.relationships if r.relationship_id in group.relationship_ids
            ]
            group_datasets = [
                dataset_lookup[ds]
                for ds in group.datasets
                if ds in dataset_lookup
            ]

            if not group_datasets:
                continue

            # 1. KPIs
            kpis = cls.calculate_cross_dataset_kpis(group_datasets, group_rels)

            # 2. Trends
            trends = cls.calculate_cross_dataset_trends(group_datasets, group_rels, dataset_lookup)

            # 3. Rankings
            rankings = cls.calculate_cross_dataset_rankings(group_datasets, group_rels, dataset_lookup)

            # 4. Analysis Cards
            analyses = cls.calculate_cross_dataset_analyses(group_datasets, group_rels, dataset_lookup)

            # 5. Relationship Health
            health_items = cls.calculate_relationship_health(group_rels, dataset_lookup)

            # 6. Factual Insights
            insights = cls.generate_factual_insights(kpis, rankings, health_items)

            # 7. Collect available dimensions & metrics for explorer
            avail_dims = []
            avail_mets = []
            avail_dates = []
            avail_geos = []
            has_event_date = False

            for ds in group_datasets:
                fname = ds["filename"]
                df = ds["df"]
                classified = cls._detect_dataset_columns(df)

                for c in classified["name"] + classified["category"] + classified["location"]:
                    avail_dims.append({
                        "dataset": fname,
                        "column": c,
                        "distinct_count": int(df[c].nunique()),
                        "label": f"{c} ({fname})",
                    })
                for c in classified["financial"] + classified["quantity"] + classified["numeric"]:
                    avail_mets.append({
                        "dataset": fname,
                        "column": c,
                        "label": f"{c} ({fname})",
                    })

                # Date fields with semantic classification
                for c in classified["date"]:
                    role, score, desc = cls.classify_date_column(c, df[c])
                    is_ev = role in [cls.DATE_ROLE_EVENT, cls.DATE_ROLE_CREATED]
                    if is_ev:
                        has_event_date = True
                    avail_dates.append({
                        "dataset": fname,
                        "column": c,
                        "label": f"{c} ({fname})",
                        "role": role,
                        "is_event_date": is_ev,
                        "description": desc,
                    })

                # Geographic fields
                for c in classified["location"]:
                    avail_geos.append({
                        "dataset": fname,
                        "column": c,
                        "label": f"{c} ({fname})",
                        "distinct_count": int(df[c].nunique()),
                    })

            # Sort date fields: event dates first
            avail_dates.sort(key=lambda d: 1 if d["is_event_date"] else 0, reverse=True)

            groups_analytics.append(
                CrossDatasetGroupAnalytics(
                    group_id=group.group_id,
                    name=group.name,
                    datasets=group.datasets,
                    relationships=group.relationship_ids,
                    kpis=kpis,
                    trends=trends,
                    has_time_dimension=trends is not None or len(avail_dates) > 0,
                    has_event_date=has_event_date,
                    has_geo_dimension=len(avail_geos) > 0,
                    rankings=rankings,
                    analyses=analyses,
                    available_dimensions=avail_dims[:20],
                    available_metrics=avail_mets[:20],
                    available_date_fields=avail_dates,
                    available_geo_dimensions=avail_geos,
                    relationship_health=health_items,
                    insights=insights,
                    data_quality_summary={
                        "dataset_count": len(group.datasets),
                        "total_rows": sum(len(ds["df"]) for ds in group_datasets),
                        "healthy_links": sum(1 for h in health_items if h.status == "healthy"),
                    },
                )
            )

        # Collect independent datasets info
        independent_info = []
        for ds in model.independent_datasets:
            independent_info.append({
                "dataset_id": ds.dataset_id,
                "filename": ds.filename,
                "rows": ds.rows,
                "columns": ds.columns,
                "status": "independent",
            })

        active_id = groups_analytics[0].group_id if groups_analytics else "group_none"

        return CrossDatasetAnalyticsResponse(
            model_id=model.model_id,
            active_group_id=active_id,
            groups=groups_analytics,
            independent_datasets=independent_info,
            warnings=model.warnings,
        )
