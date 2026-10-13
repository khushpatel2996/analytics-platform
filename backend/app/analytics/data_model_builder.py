import re
import uuid
from typing import Any, Dict, List, Optional, Set, Tuple

import pandas as pd

from backend.app.analytics.relationship_detector import RelationshipDetector
from backend.app.core.logging import logger
from backend.app.schemas.upload import (
    ConnectedComponentGroup,
    DataModelDataset,
    DataModelRelationship,
    DataModelResponse,
    DataModelSummary,
    RelationshipCandidate,
)


class DataModelBuilder:
    """
    Builds and validates a structured Data Model from user-accepted relationships
    across multiple uploaded tabular datasets.

    Validates schema existence, column existence, data type compatibility,
    key uniqueness, null rates, and cardinality invariants without merging tables.
    """

    @classmethod
    def _create_dataset_lookup(
        cls, datasets: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Builds a multi-key lookup dictionary for datasets by filename, dataset_id,
        and normalized slugs.
        """
        lookup: Dict[str, Dict[str, Any]] = {}
        for ds in datasets:
            filename = ds.get("filename", "")
            ds_id = ds.get("dataset_id", "")

            if filename:
                lookup[filename] = ds
                lookup[filename.lower()] = ds
                # Also without extension
                base_name = filename.rsplit(".", 1)[0]
                lookup[base_name] = ds
                lookup[base_name.lower()] = ds

            if ds_id:
                lookup[ds_id] = ds
                lookup[ds_id.lower()] = ds

        return lookup

    @classmethod
    def validate_relationship(
        cls,
        rel: RelationshipCandidate,
        dataset_lookup: Dict[str, Dict[str, Any]],
    ) -> Tuple[bool, str, List[str]]:
        """
        Validates an accepted relationship candidate against actual dataset DataFrames.
        Returns:
            (is_valid, validation_status, notes_or_errors)
            where validation_status is 'valid', 'warning', or 'invalid'.
        """
        errors: List[str] = []
        notes: List[str] = []

        # 1. Check datasets exist
        left_ds = dataset_lookup.get(rel.left_dataset) or dataset_lookup.get(rel.left_dataset.lower())
        if not left_ds and rel.left_dataset_id:
            left_ds = dataset_lookup.get(rel.left_dataset_id)

        right_ds = dataset_lookup.get(rel.right_dataset) or dataset_lookup.get(rel.right_dataset.lower())
        if not right_ds and rel.right_dataset_id:
            right_ds = dataset_lookup.get(rel.right_dataset_id)

        if not left_ds or not right_ds:
            missing = []
            if not left_ds:
                missing.append(f"Left dataset '{rel.left_dataset}'")
            if not right_ds:
                missing.append(f"Right dataset '{rel.right_dataset}'")
            err = f"Dataset validation failed: {', '.join(missing)} not found in active session."
            return False, "invalid", [err]

        df_left: pd.DataFrame = left_ds["df"]
        df_right: pd.DataFrame = right_ds["df"]
        fn_left = left_ds.get("filename", rel.left_dataset)
        fn_right = right_ds.get("filename", rel.right_dataset)

        # 2. Check columns exist
        col_l = rel.left_column
        col_r = rel.right_column

        if col_l not in df_left.columns:
            errors.append(f"Column '{col_l}' does not exist in {fn_left}.")
        if col_r not in df_right.columns:
            errors.append(f"Column '{col_r}' does not exist in {fn_right}.")

        if errors:
            return False, "invalid", errors

        # 3. Data type compatibility
        s_left = df_left[col_l]
        s_right = df_right[col_r]
        is_compat, type_l_desc, type_r_desc = RelationshipDetector.check_type_compatibility(s_left, s_right)
        if not is_compat:
            err = (
                f"Incompatible data types: {fn_left}.{col_l} ({type_l_desc}) "
                f"cannot be joined with {fn_right}.{col_r} ({type_r_desc})."
            )
            return False, "invalid", [err]

        # 4. Null percentage check
        clean_left = s_left.dropna()
        clean_right = s_right.dropna()

        null_rate_l = s_left.isna().mean()
        null_rate_r = s_right.isna().mean()

        if null_rate_l > 0.90:
            errors.append(
                f"Key column '{col_l}' in {fn_left} contains excessive missing values ({round(null_rate_l * 100)}%)."
            )
        if null_rate_r > 0.90:
            errors.append(
                f"Key column '{col_r}' in {fn_right} contains excessive missing values ({round(null_rate_r * 100)}%)."
            )

        if errors:
            return False, "invalid", errors

        # 5. Overlap check
        if len(clean_left) == 0 or len(clean_right) == 0:
            err = f"Key column in {fn_left} or {fn_right} contains zero valid values."
            return False, "invalid", [err]

        # Convert to string sets for safe value comparison
        vals_l = set(clean_left.astype(str).unique())
        vals_r = set(clean_right.astype(str).unique())
        overlap_count = len(vals_l.intersection(vals_r))

        if overlap_count == 0:
            err = (
                f"Zero overlapping values found between {fn_left}.{col_l} "
                f"and {fn_right}.{col_r}."
            )
            return False, "invalid", [err]

        # 6. Cardinality & Key Uniqueness Validation
        unique_l = clean_left.is_unique
        unique_r = clean_right.is_unique
        rel_type = rel.relationship_type.lower()

        validation_status = "valid"

        if rel_type == "one_to_one":
            if not (unique_l and unique_r):
                err = "The selected relationship was marked 1:1, but duplicate keys were found."
                return False, "invalid", [err]
            notes.append(f"Confirmed 1:1 link: '{col_l}' and '{col_r}' are both unique.")

        elif rel_type == "one_to_many":
            if not unique_l:
                err = (
                    f"The selected relationship was marked 1:Many, but duplicate keys "
                    f"were found in {fn_left}.{col_l}."
                )
                return False, "invalid", [err]
            notes.append(f"Confirmed 1:Many link: '{col_l}' is unique in {fn_left}.")

        elif rel_type == "many_to_one":
            if not unique_r:
                err = (
                    f"The selected relationship was marked Many:1, but duplicate keys "
                    f"were found in {fn_right}.{col_r}."
                )
                return False, "invalid", [err]
            notes.append(f"Confirmed Many:1 link: '{col_r}' is unique in {fn_right}.")

        elif rel_type == "many_to_many":
            validation_status = "warning"
            notes.append(
                f"Many:Many relationship declared between {fn_left}.{col_l} and {fn_right}.{col_r}. "
                "Joins may produce Cartesian row multiplication."
            )
        else:
            notes.append(f"Relationship declared as {rel.relationship_type}.")

        notes.append(f"{overlap_count:,} shared distinct values.")
        return True, validation_status, notes

    @classmethod
    def compute_connected_components(
        cls,
        dataset_filenames: List[str],
        relationships: List[DataModelRelationship],
    ) -> Tuple[List[ConnectedComponentGroup], List[str]]:
        """
        Builds an undirected graph of datasets and relationships,
        identifying connected components and independent (orphan) datasets.
        """
        adj: Dict[str, Set[str]] = {fn: set() for fn in dataset_filenames}
        edge_rel_ids: Dict[Tuple[str, str], List[str]] = {}

        for rel in relationships:
            l = rel.left_dataset
            r = rel.right_dataset
            if l in adj and r in adj:
                adj[l].add(r)
                adj[r].add(l)

                pair_key = tuple(sorted([l, r]))
                if pair_key not in edge_rel_ids:
                    edge_rel_ids[pair_key] = []
                edge_rel_ids[pair_key].append(rel.relationship_id)

        visited: Set[str] = set()
        connected_groups: List[ConnectedComponentGroup] = []
        independent_datasets: List[str] = []
        group_counter = 1

        for ds_name in dataset_filenames:
            if ds_name in visited:
                continue

            # BFS traversal
            component: List[str] = []
            queue = [ds_name]
            visited.add(ds_name)

            while queue:
                curr = queue.pop(0)
                component.append(curr)
                for neighbor in adj.get(curr, set()):
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append(neighbor)

            if len(component) >= 2:
                # Find all relationship IDs linking this component
                comp_rels: List[str] = []
                comp_set = set(component)
                for rel in relationships:
                    if rel.left_dataset in comp_set and rel.right_dataset in comp_set:
                        comp_rels.append(rel.relationship_id)

                # Generate a human-friendly name (e.g. "Customers ↔ Orders")
                base_names = [fn.rsplit(".", 1)[0].replace("_", " ").title() for fn in component]
                friendly_name = f"Connected Group {group_counter} ({' ↔ '.join(base_names[:3])}{'...' if len(base_names) > 3 else ''})"

                connected_groups.append(
                    ConnectedComponentGroup(
                        group_id=f"group_{group_counter}",
                        name=friendly_name,
                        datasets=component,
                        relationship_ids=comp_rels,
                    )
                )
                group_counter += 1
            else:
                independent_datasets.append(component[0])

        return connected_groups, independent_datasets

    @classmethod
    def build_data_model(
        cls,
        datasets: List[Dict[str, Any]],
        accepted_relationships: List[RelationshipCandidate],
        model_id: Optional[str] = None,
    ) -> DataModelResponse:
        """
        Takes uploaded datasets and user-accepted relationships,
        validates every link, identifies key roles, analyzes connectivity,
        and constructs a validated Data Model.
        """
        lookup = cls._create_dataset_lookup(datasets)
        unique_keys_map: Dict[str, Set[str]] = {}
        rel_keys_map: Dict[str, Set[str]] = {}

        # Collect unique canonical filenames
        all_dataset_names: List[str] = []
        model_datasets_dict: Dict[str, DataModelDataset] = {}

        for ds in datasets:
            fn = ds.get("filename", "")
            ds_id = ds.get("dataset_id", fn)
            df: pd.DataFrame = ds["df"]

            all_dataset_names.append(fn)
            unique_keys_map[fn] = set()
            rel_keys_map[fn] = set()

            model_datasets_dict[fn] = DataModelDataset(
                dataset_id=ds_id,
                filename=fn,
                rows=len(df),
                columns=len(df.columns),
                unique_keys=[],
                relationship_keys=[],
                all_columns=list(df.columns),
            )

        validated_relationships: List[DataModelRelationship] = []
        model_errors: List[str] = []
        model_warnings: List[str] = []

        # Only evaluate relationships with status == 'accepted'
        confirmed_candidates = [
            r for r in accepted_relationships if getattr(r, "status", "") == "accepted"
        ]

        has_validation_failures = False
        has_warnings = False

        for cand in confirmed_candidates:
            is_valid, v_status, notes = cls.validate_relationship(cand, lookup)

            # Map canonical filenames
            left_ds_entry = lookup.get(cand.left_dataset) or lookup.get(cand.left_dataset.lower())
            right_ds_entry = lookup.get(cand.right_dataset) or lookup.get(cand.right_dataset.lower())

            left_fn = left_ds_entry.get("filename", cand.left_dataset) if left_ds_entry else cand.left_dataset
            right_fn = right_ds_entry.get("filename", cand.right_dataset) if right_ds_entry else cand.right_dataset

            if not is_valid:
                has_validation_failures = True
                model_errors.extend(notes)
                validated_relationships.append(
                    DataModelRelationship(
                        relationship_id=cand.relationship_id,
                        left_dataset=left_fn,
                        left_dataset_id=cand.left_dataset_id,
                        left_column=cand.left_column,
                        right_dataset=right_fn,
                        right_dataset_id=cand.right_dataset_id,
                        right_column=cand.right_column,
                        relationship_type=cand.relationship_type,
                        confidence=cand.confidence,
                        status="accepted",
                        validation_status="invalid",
                        validation_notes=notes,
                    )
                )
            else:
                if v_status == "warning":
                    has_warnings = True
                    model_warnings.extend(notes)

                # Record key roles
                rel_t = cand.relationship_type.lower()
                if rel_t == "one_to_many":
                    unique_keys_map[left_fn].add(cand.left_column)
                    rel_keys_map[right_fn].add(cand.right_column)
                elif rel_t == "many_to_one":
                    unique_keys_map[right_fn].add(cand.right_column)
                    rel_keys_map[left_fn].add(cand.left_column)
                elif rel_t == "one_to_one":
                    unique_keys_map[left_fn].add(cand.left_column)
                    unique_keys_map[right_fn].add(cand.right_column)
                else:  # many_to_many
                    rel_keys_map[left_fn].add(cand.left_column)
                    rel_keys_map[right_fn].add(cand.right_column)

                validated_relationships.append(
                    DataModelRelationship(
                        relationship_id=cand.relationship_id,
                        left_dataset=left_fn,
                        left_dataset_id=cand.left_dataset_id,
                        left_column=cand.left_column,
                        right_dataset=right_fn,
                        right_dataset_id=cand.right_dataset_id,
                        right_column=cand.right_column,
                        relationship_type=cand.relationship_type,
                        confidence=cand.confidence,
                        status="accepted",
                        validation_status=v_status,
                        validation_notes=notes,
                    )
                )

        # Update dataset models with confirmed keys
        for fn, ds_obj in model_datasets_dict.items():
            ds_obj.unique_keys = sorted(list(unique_keys_map.get(fn, set())))
            ds_obj.relationship_keys = sorted(list(rel_keys_map.get(fn, set())))

        # Filter relationships that are valid for connectivity graph
        valid_rels_for_graph = [
            r for r in validated_relationships if r.validation_status != "invalid"
        ]

        # Compute connected components and orphan datasets
        connected_groups, orphan_names = cls.compute_connected_components(
            all_dataset_names, valid_rels_for_graph
        )

        orphan_datasets: List[DataModelDataset] = [
            model_datasets_dict[fn] for fn in orphan_names if fn in model_datasets_dict
        ]

        if orphan_datasets and connected_groups:
            orphan_fn_str = ", ".join(d.filename for d in orphan_datasets)
            model_warnings.append(
                f"{len(orphan_datasets)} dataset(s) ({orphan_fn_str}) are independent with no confirmed connections."
            )
            has_warnings = True

        # Determine overall model status
        if has_validation_failures:
            overall_status = "invalid"
        elif has_warnings or (len(confirmed_candidates) == 0 and len(all_dataset_names) > 1):
            overall_status = "warning"
        else:
            overall_status = "valid"

        assigned_model_id = model_id or f"model_{uuid.uuid4().hex[:10]}"

        summary = DataModelSummary(
            dataset_count=len(all_dataset_names),
            relationship_count=len(confirmed_candidates),
            connected_components=len(connected_groups),
            independent_count=len(orphan_datasets),
            status=overall_status,
        )

        return DataModelResponse(
            success=True,
            model_id=assigned_model_id,
            status=overall_status,
            datasets=list(model_datasets_dict.values()),
            relationships=validated_relationships,
            connected_components=connected_groups,
            independent_datasets=orphan_datasets,
            warnings=list(dict.fromkeys(model_warnings)),
            errors=list(dict.fromkeys(model_errors)),
            summary=summary,
        )
