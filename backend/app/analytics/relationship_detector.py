import difflib
import re
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np
import pandas as pd

from backend.app.core.logging import logger
from backend.app.schemas.upload import (
    DatasetProfileResponse,
    RelationshipCandidate,
    RelationshipSignals,
)


class RelationshipDetector:
    """
    Modular engine for detecting relational keys and cardinalities across uploaded tabular datasets.
    Evaluates:
      1. Normalized column name similarity & entity naming patterns
      2. Physical and semantic data type compatibility
      3. Set-based distinct value overlap
      4. Key uniqueness and cardinality (1:1, 1:Many, Many:1, Many:Many)
      5. Null value frequency penalty
      6. False positive protection against generic 'id' and numerical measure collisions
    """

    GENERIC_KEY_NAMES: Set[str] = {
        "id", "key", "code", "no", "num", "number", "value", "val", "name", "type", "status", "date"
    }

    EXCLUDED_MEASURE_NAMES: Set[str] = {
        "revenue", "sales", "price", "cost", "salary", "quantity", "qty", "amount",
        "total", "score", "discount", "margin", "tax", "fee", "subtotal", "rating",
        "percentage", "rate", "latitude", "longitude", "lat", "lng", "age", "weight",
        "height", "distance", "temperature", "temp", "humidity", "profit", "loss",
    }

    COMMON_ABBREVIATIONS: Dict[str, str] = {
        "cust": "customer",
        "prod": "product",
        "emp": "employee",
        "dept": "department",
        "org": "organization",
        "cat": "category",
        "ord": "order",
        "num": "number",
        "no": "number",
    }

    @classmethod
    def normalize_name(cls, col_name: str) -> str:
        """
        Normalizes column or table names:
        - camelCase to snake_case
        - hyphens, spaces, dots to underscores
        - lowercase and strip
        """
        # camelCase to snake_case
        s = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", col_name)
        # replace non-alphanumeric with underscores
        s = re.sub(r"[^a-zA-Z0-9]+", "_", s).lower().strip("_")
        return s

    @classmethod
    def get_table_stem(cls, filename: str) -> str:
        """Extracts sanitized entity stem from dataset filename (e.g. customers.csv -> customer)."""
        stem = re.sub(r"\.[^.]+$", "", filename)
        norm = cls.normalize_name(stem)
        # remove common prefixes like tbl_, ds_, data_
        norm = re.sub(r"^(tbl_|ds_|data_)", "", norm)
        # singularize simple plurals (customers -> customer, orders -> order, products -> product)
        if norm.endswith("ies"):
            norm = norm[:-3] + "y"
        elif norm.endswith("s") and not norm.endswith("ss"):
            norm = norm[:-1]
        return norm

    @classmethod
    def expand_abbreviations(cls, norm_name: str) -> str:
        """Expands common abbreviations in normalized name."""
        tokens = norm_name.split("_")
        expanded = [cls.COMMON_ABBREVIATIONS.get(t, t) for t in tokens]
        return "_".join(expanded)

    @classmethod
    def calculate_name_similarity(
        cls,
        col_left: str,
        table_left: str,
        col_right: str,
        table_right: str,
    ) -> Tuple[float, bool]:
        """
        Calculates column name similarity between 0.0 and 1.0.
        Returns (similarity_score, is_generic_id_collision).
        """
        norm_l = cls.normalize_name(col_left)
        norm_r = cls.normalize_name(col_right)

        table_stem_l = cls.get_table_stem(table_left)
        table_stem_r = cls.get_table_stem(table_right)

        # 1. Check for generic ID collision (e.g. customers.id vs products.id)
        if norm_l in cls.GENERIC_KEY_NAMES and norm_r in cls.GENERIC_KEY_NAMES:
            if norm_l == norm_r:
                # If table stems are different, two plain 'id' columns represent different entities!
                if table_stem_l != table_stem_r:
                    return 0.20, True
                return 1.0, False

        # 2. Exact match
        if norm_l == norm_r:
            return 1.0, False

        # 3. Expanded abbreviation match (e.g. cust_id ↔ customer_id)
        exp_l = cls.expand_abbreviations(norm_l)
        exp_r = cls.expand_abbreviations(norm_r)
        if exp_l == exp_r:
            return 0.95, False

        # 4. Entity table name matching foreign key pattern:
        # e.g. Left table is 'customers' (stem 'customer') with column 'id',
        # while right table is 'orders' with column 'customer_id' (or vice versa).
        if (norm_l in ("id", f"{table_stem_l}_id") and norm_r == f"{table_stem_l}_id") or \
           (norm_r in ("id", f"{table_stem_r}_id") and norm_l == f"{table_stem_r}_id"):
            return 0.95, False

        # 5. Fuzzy string ratio
        ratio = difflib.SequenceMatcher(None, exp_l, exp_r).ratio()
        if ratio >= 0.85:
            return ratio, False
        if ratio >= 0.70:
            return ratio * 0.9, False

        return ratio * 0.5, False

    @classmethod
    def check_type_compatibility(
        cls,
        s_left: pd.Series,
        s_right: pd.Series,
    ) -> Tuple[bool, str, str]:
        """
        Checks whether two Series have compatible data types.
        Returns (is_compatible, type_left_desc, type_right_desc).
        """
        # Drop nulls for sample inspection
        sample_l = s_left.dropna().head(100)
        sample_r = s_right.dropna().head(100)

        if sample_l.empty or sample_r.empty:
            return False, "empty", "empty"

        is_l_bool = pd.api.types.is_bool_dtype(s_left)
        is_r_bool = pd.api.types.is_bool_dtype(s_right)
        if is_l_bool or is_r_bool:
            # Booleans can only match booleans
            return (is_l_bool and is_r_bool), "boolean", "boolean" if is_r_bool else "non-boolean"

        is_l_numeric = pd.api.types.is_numeric_dtype(s_left)
        is_r_numeric = pd.api.types.is_numeric_dtype(s_right)

        # Datetime check
        is_l_dt = pd.api.types.is_datetime64_any_dtype(s_left)
        is_r_dt = pd.api.types.is_datetime64_any_dtype(s_right)
        if is_l_dt or is_r_dt:
            if is_l_dt and is_r_dt:
                return True, "datetime", "datetime"
            # Datetime cannot join with numeric
            if is_l_numeric or is_r_numeric:
                return False, "datetime" if is_l_dt else "numeric", "numeric" if is_r_numeric else "datetime"
            # Check string dates
            return False, "datetime" if is_l_dt else "text", "text" if is_r_dt else "datetime"

        # Both numeric
        if is_l_numeric and is_r_numeric:
            return True, "numeric", "numeric"

        # Both string/object
        if not is_l_numeric and not is_r_numeric:
            return True, "string", "string"

        # One numeric and one string: check if the string column contains numeric values (e.g. '101', '102')
        num_series = sample_l if is_l_numeric else sample_r
        str_series = sample_r if is_l_numeric else sample_l

        try:
            converted = pd.to_numeric(str_series.astype(str), errors="coerce")
            valid_pct = converted.notna().mean()
            if valid_pct >= 0.90:
                return True, "numeric", "numeric (string-encoded)"
        except Exception:
            pass

        return False, "numeric" if is_l_numeric else "string", "string" if is_l_numeric else "numeric"

    @classmethod
    def calculate_value_overlap(
        cls,
        s_left: pd.Series,
        s_right: pd.Series,
    ) -> Tuple[int, int, int, float, float, float]:
        """
        Computes distinct value overlap using set operations.
        Returns:
          (left_unique, right_unique, overlap_unique, overlap_pct_left, overlap_pct_right, max_overlap)
        """
        # Normalize non-null values to trimmed strings (stripping trailing .0 for clean int-float matching)
        def clean_val(v: Any) -> str:
            if pd.isna(v) or v is None:
                return ""
            if isinstance(v, (float, np.floating)):
                if v.is_integer():
                    return str(int(v))
            s = str(v).strip()
            if s.endswith(".0") and s[:-2].replace("-", "").isdigit():
                return s[:-2]
            return s

        vals_l = {clean_val(v) for v in s_left.dropna() if str(v).strip()}
        vals_r = {clean_val(v) for v in s_right.dropna() if str(v).strip()}

        vals_l.discard("")
        vals_r.discard("")

        len_l = len(vals_l)
        len_r = len(vals_r)

        if len_l == 0 or len_r == 0:
            return (len_l, len_r, 0, 0.0, 0.0, 0.0)

        intersection = vals_l.intersection(vals_r)
        len_overlap = len(intersection)

        pct_l = round(float(len_overlap / len_l), 4) if len_l > 0 else 0.0
        pct_r = round(float(len_overlap / len_r), 4) if len_r > 0 else 0.0
        max_overlap = round(max(pct_l, pct_r), 4)

        return (len_l, len_r, len_overlap, pct_l, pct_r, max_overlap)

    @classmethod
    def is_candidate_column(cls, col_name: str, s: pd.Series) -> bool:
        """Checks if a column is plausible for relational key evaluation."""
        norm = cls.normalize_name(col_name)

        # Allow if name ends with _id, _key, _no, _code, _num
        if any(norm.endswith(suffix) for suffix in ("_id", "_key", "_no", "_code", "_num", "_pk", "_fk")):
            return True

        # Exclude obvious measure/metric columns unless explicitly named as key
        if norm in cls.EXCLUDED_MEASURE_NAMES:
            return False

        # Exclude columns with 100% null values
        if s.isna().all():
            return False

        # Exclude boolean columns from being keys
        if pd.api.types.is_bool_dtype(s):
            return False

        # Exclude datetime columns from being foreign keys
        if pd.api.types.is_datetime64_any_dtype(s):
            return False

        return True

    @classmethod
    def evaluate_pair(
        cls,
        df_a: pd.DataFrame,
        filename_a: str,
        col_a: str,
        df_b: pd.DataFrame,
        filename_b: str,
        col_b: str,
        dataset_id_a: Optional[str] = None,
        dataset_id_b: Optional[str] = None,
    ) -> Optional[RelationshipCandidate]:
        """Evaluates a pair of columns across two datasets and calculates relationship confidence."""
        s_a = df_a[col_a]
        s_b = df_b[col_b]

        # 1. Name similarity and generic ID check
        name_sim, is_generic_id = cls.calculate_name_similarity(
            col_left=col_a,
            table_left=filename_a,
            col_right=col_b,
            table_right=filename_b,
        )

        # If name similarity is very low and neither is an explicit key name, skip early
        norm_a = cls.normalize_name(col_a)
        norm_b = cls.normalize_name(col_b)
        has_key_suffix = (norm_a.endswith("_id") or norm_b.endswith("_id"))
        if name_sim < 0.35 and not has_key_suffix:
            return None

        # 2. Type compatibility
        type_compat, type_l_desc, type_r_desc = cls.check_type_compatibility(s_a, s_b)
        if not type_compat:
            return None

        # 3. Uniqueness check
        non_null_a = s_a.dropna()
        non_null_b = s_b.dropna()
        rows_a = len(non_null_a)
        rows_b = len(non_null_b)
        if rows_a == 0 or rows_b == 0:
            return None

        unique_a = (non_null_a.nunique() == rows_a)
        unique_b = (non_null_b.nunique() == rows_b)

        # Determine orientation: Put unique side on the LEFT (Parent 1 -> Child Many)
        if not unique_a and unique_b:
            # Swap so that unique Parent is on the left
            return cls.evaluate_pair(
                df_a=df_b,
                filename_a=filename_b,
                col_a=col_b,
                df_b=df_a,
                filename_b=filename_a,
                col_b=col_a,
                dataset_id_a=dataset_id_b,
                dataset_id_b=dataset_id_a,
            )

        # Determine cardinality
        if unique_a and unique_b:
            rel_type = "one_to_one"
        elif unique_a and not unique_b:
            rel_type = "one_to_many"
        elif not unique_a and unique_b:
            rel_type = "many_to_one"
        else:
            rel_type = "many_to_many"

        # 4. Value Overlap
        len_l, len_r, len_overlap, pct_l, pct_r, max_overlap = cls.calculate_value_overlap(s_a, s_b)

        # In a 1:Many relationship, the Child (right) keys should overlap strongly with Parent (left)
        child_overlap = pct_r if rel_type == "one_to_many" else max_overlap

        # If zero value overlap, this cannot be a valid relationship
        if len_overlap == 0:
            return None

        # 5. Null rates
        null_rate_a = round(float(s_a.isna().mean()), 4)
        null_rate_b = round(float(s_b.isna().mean()), 4)

        # 6. Confidence Score Calculation
        # Weights: Name Similarity (30%), Value Overlap (30%), Type (15%), Uniqueness (15%), Null Quality (10%)
        # Uniqueness score:
        if rel_type in ("one_to_many", "one_to_one"):
            uniqueness_score = 1.0
        elif rel_type == "many_to_many":
            uniqueness_score = 0.5
        else:
            uniqueness_score = 0.8

        null_quality = max(0.0, 1.0 - (null_rate_a * 2.0) - (null_rate_b * 1.5))

        # Value overlap factor
        overlap_factor = child_overlap if rel_type == "one_to_many" else max_overlap

        raw_score = (
            (name_sim * 30.0) +
            (overlap_factor * 30.0) +
            (15.0 if type_compat else 0.0) +
            (uniqueness_score * 15.0) +
            (null_quality * 10.0)
        )

        # FALSE POSITIVE GUARDS:
        # A. Generic ID collision: plain 'id' vs 'id' between different entities
        if is_generic_id:
            # Drastically reduce confidence unless there is extraordinary proof
            raw_score = min(raw_score * 0.45, 38.0)

        # B. Low overlap penalty
        if overlap_factor < 0.20:
            raw_score = min(raw_score, 45.0)

        # C. Primary key & foreign key null penalties
        max_null = max(null_rate_a, null_rate_b)
        if max_null > 0.20:
            raw_score = raw_score * (1.0 - max_null * 0.75)
        elif unique_a and null_rate_a > 0.05:
            raw_score = raw_score * (1.0 - null_rate_a)

        # Clamp confidence to integer 0 - 100
        confidence = int(max(0, min(100, round(raw_score))))

        # Filter out anything below 50 confidence
        if confidence < 50:
            return None

        # Match level
        if confidence >= 85:
            match_level = "Strong Match"
        elif confidence >= 70:
            match_level = "Possible Match"
        else:
            match_level = "Weak Match"

        # 7. Generate Human-Readable Explanations
        explanations: List[str] = []

        if name_sim >= 0.95:
            explanations.append(f"Column names match strongly ('{col_a}' ↔ '{col_b}')")
        elif name_sim >= 0.70:
            explanations.append(f"Column names are similar ('{col_a}' ↔ '{col_b}')")
        else:
            explanations.append("Column names are compatible")

        explanations.append(f"Data types are compatible ({type_l_desc} ↔ {type_r_desc})")

        overlap_display_pct = int(round(overlap_factor * 100))
        explanations.append(f"{overlap_display_pct}% value overlap ({len_overlap:,} shared distinct values)")

        if rel_type == "one_to_many":
            explanations.append(f"'{col_a}' is unique in {filename_a} (1)")
            explanations.append(f"'{col_b}' contains repeated values in {filename_b} (Many)")
        elif rel_type == "one_to_one":
            explanations.append("Both candidate columns have unique values (1 : 1)")
        else:
            explanations.append("Cardinality indicates many-to-many references")

        if null_rate_a > 0.05 or null_rate_b > 0.05:
            explanations.append(
                f"Missing values present: {round(null_rate_a * 100, 1)}% in {filename_a}, "
                f"{round(null_rate_b * 100, 1)}% in {filename_b}"
            )
        else:
            explanations.append("High completeness with zero or negligible missing values")

        rel_id = f"rel_{cls.normalize_name(filename_a)}_{cls.normalize_name(col_a)}_to_{cls.normalize_name(filename_b)}_{cls.normalize_name(col_b)}"

        return RelationshipCandidate(
            relationship_id=rel_id,
            left_dataset=filename_a,
            left_dataset_id=dataset_id_a,
            left_column=col_a,
            right_dataset=filename_b,
            right_dataset_id=dataset_id_b,
            right_column=col_b,
            relationship_type=rel_type,
            confidence=confidence,
            match_level=match_level,
            signals=RelationshipSignals(
                name_similarity=round(name_sim, 2),
                type_compatible=type_compat,
                value_overlap=round(overlap_factor, 2),
                left_unique=unique_a,
                right_unique=unique_b,
                left_null_rate=null_rate_a,
                right_null_rate=null_rate_b,
                left_unique_values=len_l,
                right_unique_values=len_r,
                overlap_unique_values=len_overlap,
                overlap_percentage_left=pct_l,
                overlap_percentage_right=pct_r,
            ),
            explanation=explanations,
            status="suggested",
        )

    @classmethod
    def detect_relationships(
        cls,
        datasets: List[Dict[str, Any]],
    ) -> List[RelationshipCandidate]:
        """
        Inspects all pairs of datasets and discovers candidate relationships.
        Input format:
          datasets: list of dicts with:
            - 'df': pd.DataFrame
            - 'filename': str
            - 'dataset_id': Optional[str]
            - 'profile': Optional[DatasetProfileResponse]
        Returns list of RelationshipCandidate sorted by confidence descending.
        """
        if len(datasets) < 2:
            return []

        candidates: List[RelationshipCandidate] = []
        seen_pairs: Set[Tuple[str, str, str, str]] = set()

        num_datasets = len(datasets)
        for i in range(num_datasets):
            for j in range(i + 1, num_datasets):
                ds_a = datasets[i]
                ds_b = datasets[j]

                df_a = ds_a["df"]
                df_b = ds_b["df"]
                fn_a = ds_a.get("filename") or f"dataset_{i+1}"
                fn_b = ds_b.get("filename") or f"dataset_{j+1}"
                id_a = ds_a.get("dataset_id")
                id_b = ds_b.get("dataset_id")

                # Filter candidate columns
                cols_a = [c for c in df_a.columns if cls.is_candidate_column(c, df_a[c])]
                cols_b = [c for c in df_b.columns if cls.is_candidate_column(c, df_b[c])]

                for col_a in cols_a:
                    for col_b in cols_b:
                        cand = cls.evaluate_pair(
                            df_a=df_a,
                            filename_a=fn_a,
                            col_a=col_a,
                            df_b=df_b,
                            filename_b=fn_b,
                            col_b=col_b,
                            dataset_id_a=id_a,
                            dataset_id_b=id_b,
                        )

                        if cand and cand.confidence >= 50:
                            # Deduplicate directional duplicate candidates
                            pair_key = (
                                cand.left_dataset, cand.left_column,
                                cand.right_dataset, cand.right_column
                            )
                            rev_key = (
                                cand.right_dataset, cand.right_column,
                                cand.left_dataset, cand.left_column
                            )
                            if pair_key not in seen_pairs and rev_key not in seen_pairs:
                                seen_pairs.add(pair_key)
                                candidates.append(cand)

        # Sort by confidence descending
        candidates.sort(key=lambda c: c.confidence, reverse=True)
        logger.info(f"Detected {len(candidates)} candidate relationships across {num_datasets} datasets.")
        return candidates
