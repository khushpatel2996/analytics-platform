import io
import pytest
import pandas as pd
from backend.app.analytics.data_model_builder import DataModelBuilder
from backend.app.schemas.upload import RelationshipCandidate, RelationshipSignals


def make_candidate(
    rel_id: str,
    left_ds: str,
    left_col: str,
    right_ds: str,
    right_col: str,
    rel_type: str = "one_to_many",
    status: str = "accepted",
    confidence: int = 95,
) -> RelationshipCandidate:
    return RelationshipCandidate(
        relationship_id=rel_id,
        left_dataset=left_ds,
        left_column=left_col,
        right_dataset=right_ds,
        right_column=right_col,
        relationship_type=rel_type,
        confidence=confidence,
        match_level="Strong Match",
        signals=RelationshipSignals(
            name_similarity=1.0,
            type_compatible=True,
            value_overlap=0.95,
            left_unique=True,
            right_unique=False,
            left_null_rate=0.0,
            right_null_rate=0.0,
            left_unique_values=10,
            right_unique_values=10,
            overlap_unique_values=10,
            overlap_percentage_left=1.0,
            overlap_percentage_right=1.0,
        ),
        explanation=["Match"],
        status=status,
    )


def test_1_customers_and_orders_data_model():
    """TEST 1: customers.csv + orders.csv -> Valid model, 1 relationship, 1 connected component."""
    df_customers = pd.DataFrame({
        "customer_id": ["C1", "C2", "C3", "C4"],
        "name": ["Aarav", "Diya", "Rohan", "Pooja"],
    })
    df_orders = pd.DataFrame({
        "order_id": ["O1", "O2", "O3", "O4", "O5"],
        "customer_id": ["C1", "C2", "C1", "C3", "C2"],
        "amount": [100, 200, 150, 300, 250],
    })

    datasets = [
        {"df": df_customers, "filename": "customers.csv", "dataset_id": "customers"},
        {"df": df_orders, "filename": "orders.csv", "dataset_id": "orders"},
    ]

    candidate = make_candidate("rel_1", "customers.csv", "customer_id", "orders.csv", "customer_id", "one_to_many")
    model = DataModelBuilder.build_data_model(datasets, [candidate])

    assert model.status == "valid"
    assert model.summary.dataset_count == 2
    assert model.summary.relationship_count == 1
    assert model.summary.connected_components == 1
    assert model.summary.independent_count == 0
    assert len(model.relationships) == 1
    assert model.relationships[0].validation_status == "valid"

    # Check key annotation
    cust_ds = next(d for d in model.datasets if d.filename == "customers.csv")
    ord_ds = next(d for d in model.datasets if d.filename == "orders.csv")
    assert "customer_id" in cust_ds.unique_keys
    assert "customer_id" in ord_ds.relationship_keys


def test_2_four_datasets_e_commerce_star_schema():
    """TEST 2: customers + orders + products + order_items -> 4 datasets, 3 relationships, 1 connected component."""
    df_cust = pd.DataFrame({"customer_id": ["C1", "C2"], "name": ["A", "B"]})
    df_ord = pd.DataFrame({"order_id": ["O1", "O2", "O3"], "customer_id": ["C1", "C1", "C2"]})
    df_items = pd.DataFrame({"item_id": [1, 2, 3], "order_id": ["O1", "O1", "O2"], "product_id": ["P1", "P2", "P1"]})
    df_prod = pd.DataFrame({"product_id": ["P1", "P2"], "title": ["Book", "Pen"]})

    datasets = [
        {"df": df_cust, "filename": "customers.csv", "dataset_id": "customers"},
        {"df": df_ord, "filename": "orders.csv", "dataset_id": "orders"},
        {"df": df_items, "filename": "order_items.csv", "dataset_id": "order_items"},
        {"df": df_prod, "filename": "products.csv", "dataset_id": "products"},
    ]

    candidates = [
        make_candidate("r1", "customers.csv", "customer_id", "orders.csv", "customer_id", "one_to_many"),
        make_candidate("r2", "orders.csv", "order_id", "order_items.csv", "order_id", "one_to_many"),
        make_candidate("r3", "products.csv", "product_id", "order_items.csv", "product_id", "one_to_many"),
    ]

    model = DataModelBuilder.build_data_model(datasets, candidates)
    assert model.status == "valid"
    assert model.summary.dataset_count == 4
    assert model.summary.relationship_count == 3
    assert model.summary.connected_components == 1
    assert model.summary.independent_count == 0


def test_3_two_unrelated_datasets_no_error():
    """TEST 3: Two unrelated datasets with 0 accepted relationships -> 2 datasets, 0 relationships, no error."""
    df1 = pd.DataFrame({"x": [1, 2, 3]})
    df2 = pd.DataFrame({"y": ["A", "B", "C"]})

    datasets = [
        {"df": df1, "filename": "data1.csv", "dataset_id": "d1"},
        {"df": df2, "filename": "data2.csv", "dataset_id": "d2"},
    ]

    model = DataModelBuilder.build_data_model(datasets, [])
    assert model.summary.dataset_count == 2
    assert model.summary.relationship_count == 0
    assert model.summary.independent_count == 2
    assert len(model.independent_datasets) == 2
    assert len(model.relationships) == 0


def test_4_invalid_accepted_relationship_fails_validation():
    """TEST 4: Invalid accepted relationship (e.g. incompatible types or non-existent column)."""
    df_cust = pd.DataFrame({"customer_id": ["C1", "C2"], "city": ["Delhi", "Mumbai"]})
    df_ord = pd.DataFrame({"order_id": [101, 102], "order_date": pd.to_datetime(["2024-01-01", "2024-01-02"])})

    datasets = [
        {"df": df_cust, "filename": "customers.csv", "dataset_id": "cust"},
        {"df": df_ord, "filename": "orders.csv", "dataset_id": "ord"},
    ]

    # Try linking customer_id (string) to order_date (datetime)
    bad_candidate = make_candidate("bad_rel", "customers.csv", "customer_id", "orders.csv", "order_date", "one_to_many")
    model = DataModelBuilder.build_data_model(datasets, [bad_candidate])

    assert model.status == "invalid"
    assert len(model.errors) > 0
    assert model.relationships[0].validation_status == "invalid"


def test_5_one_to_one_with_duplicate_keys_flagged():
    """TEST 5: one_to_one relationship where one side has duplicate keys -> validation error."""
    df_a = pd.DataFrame({"user_id": ["U1", "U2", "U3"], "profile": ["P1", "P2", "P3"]})
    df_b = pd.DataFrame({"user_id": ["U1", "U1", "U2"], "score": [90, 80, 75]})  # duplicate U1!

    datasets = [
        {"df": df_a, "filename": "users.csv", "dataset_id": "users"},
        {"df": df_b, "filename": "scores.csv", "dataset_id": "scores"},
    ]

    cand = make_candidate("rel_121", "users.csv", "user_id", "scores.csv", "user_id", "one_to_one")
    model = DataModelBuilder.build_data_model(datasets, [cand])

    assert model.status == "invalid"
    assert any("1:1, but duplicate keys were found" in err for err in model.errors)


def test_6_one_to_many_cardinality_verified():
    """TEST 6: one_to_many relationship verified."""
    df_depts = pd.DataFrame({"dept_id": [10, 20, 30], "name": ["HR", "Eng", "Ops"]})
    df_emps = pd.DataFrame({"emp_id": [1, 2, 3, 4], "dept_id": [10, 10, 20, 30]})

    datasets = [
        {"df": df_depts, "filename": "departments.csv", "dataset_id": "depts"},
        {"df": df_emps, "filename": "employees.csv", "dataset_id": "emps"},
    ]

    cand = make_candidate("rel_dept_emp", "departments.csv", "dept_id", "employees.csv", "dept_id", "one_to_many")
    model = DataModelBuilder.build_data_model(datasets, [cand])

    assert model.status == "valid"
    dept_ds = next(d for d in model.datasets if d.filename == "departments.csv")
    emp_ds = next(d for d in model.datasets if d.filename == "employees.csv")
    assert "dept_id" in dept_ds.unique_keys
    assert "dept_id" in emp_ds.relationship_keys


def test_7_many_to_one_cardinality_verified():
    """TEST 7: many_to_one relationship verified."""
    df_emps = pd.DataFrame({"emp_id": [1, 2, 3, 4], "dept_id": [10, 10, 20, 30]})
    df_depts = pd.DataFrame({"dept_id": [10, 20, 30], "name": ["HR", "Eng", "Ops"]})

    datasets = [
        {"df": df_emps, "filename": "employees.csv", "dataset_id": "emps"},
        {"df": df_depts, "filename": "departments.csv", "dataset_id": "depts"},
    ]

    cand = make_candidate("rel_emp_dept", "employees.csv", "dept_id", "departments.csv", "dept_id", "many_to_one")
    model = DataModelBuilder.build_data_model(datasets, [cand])

    assert model.status == "valid"
    dept_ds = next(d for d in model.datasets if d.filename == "departments.csv")
    emp_ds = next(d for d in model.datasets if d.filename == "employees.csv")
    assert "dept_id" in dept_ds.unique_keys
    assert "dept_id" in emp_ds.relationship_keys


def test_8_many_to_many_relationship_supported_as_warning():
    """TEST 8: many_to_many relationship is supported and clearly marked with warning, no huge merge."""
    df_tags = pd.DataFrame({"post_id": [1, 1, 2, 3], "tag_id": [10, 20, 10, 30]})
    df_posts = pd.DataFrame({"post_id": [1, 1, 2, 4], "category": ["A", "B", "A", "C"]})

    datasets = [
        {"df": df_tags, "filename": "post_tags.csv", "dataset_id": "tags"},
        {"df": df_posts, "filename": "posts.csv", "dataset_id": "posts"},
    ]

    cand = make_candidate("rel_m2m", "post_tags.csv", "post_id", "posts.csv", "post_id", "many_to_many")
    model = DataModelBuilder.build_data_model(datasets, [cand])

    assert model.status == "warning"
    assert model.relationships[0].validation_status == "warning"
    assert any("Many:Many" in n for n in model.relationships[0].validation_notes)


def test_9_single_csv_does_not_affect_data_model():
    """TEST 9: Single dataset alone builds simple valid standalone model without breaking."""
    df_single = pd.DataFrame({"id": [1, 2, 3], "val": [10, 20, 30]})
    datasets = [{"df": df_single, "filename": "single.csv", "dataset_id": "single"}]
    model = DataModelBuilder.build_data_model(datasets, [])
    assert model.summary.dataset_count == 1
    assert model.summary.relationship_count == 0
    assert model.summary.independent_count == 1


def test_10_multiple_datasets_with_independent_dataset():
    """TEST 10: Multiple datasets with one independent dataset displays independent dataset separately."""
    df_cust = pd.DataFrame({"customer_id": ["C1", "C2"], "name": ["A", "B"]})
    df_ord = pd.DataFrame({"order_id": ["O1", "O2"], "customer_id": ["C1", "C2"]})
    df_mkt = pd.DataFrame({"campaign_id": ["M1", "M2"], "clicks": [120, 450]})

    datasets = [
        {"df": df_cust, "filename": "customers.csv", "dataset_id": "customers"},
        {"df": df_ord, "filename": "orders.csv", "dataset_id": "orders"},
        {"df": df_mkt, "filename": "marketing.csv", "dataset_id": "marketing"},
    ]

    cand = make_candidate("r1", "customers.csv", "customer_id", "orders.csv", "customer_id", "one_to_many")
    model = DataModelBuilder.build_data_model(datasets, [cand])

    assert model.summary.dataset_count == 3
    assert model.summary.relationship_count == 1
    assert model.summary.connected_components == 1
    assert model.summary.independent_count == 1
    assert len(model.independent_datasets) == 1
    assert model.independent_datasets[0].filename == "marketing.csv"
    assert any("marketing.csv" in w for w in model.warnings)


def test_data_model_api_lifecycle(client):
    """Test full Data Model API lifecycle: POST, GET, validate-relationship, DELETE."""
    csv_customers = "customer_id,name\nC1,Khush\nC2,Alex\n"
    csv_orders = "order_id,customer_id,amount\nORD1,C1,500\nORD2,C1,750\n"

    files = [
        ("files", ("customers.csv", io.BytesIO(csv_customers.encode("utf-8")), "text/csv")),
        ("files", ("orders.csv", io.BytesIO(csv_orders.encode("utf-8")), "text/csv")),
    ]

    # 1. Profile multiple files
    p_res = client.post("/api/upload/profile-multiple", files=files)
    assert p_res.status_code == 200
    pdata = p_res.json()
    ds_ids = [d["dataset_id"] for d in pdata["datasets"]]

    # 2. Build Data Model with an accepted relationship
    cand = make_candidate("rel_test_api", "customers.csv", "customer_id", "orders.csv", "customer_id", "one_to_many")
    payload = {
        "accepted_relationships": [cand.model_dump()],
        "dataset_ids": ds_ids,
    }
    dm_res = client.post("/api/upload/data-model", json=payload)
    assert dm_res.status_code == 200
    mdata = dm_res.json()
    assert mdata["success"] is True
    assert mdata["status"] == "valid"
    assert mdata["summary"]["relationship_count"] == 1

    # 3. GET /api/upload/data-model
    get_res = client.get("/api/upload/data-model")
    assert get_res.status_code == 200
    assert get_res.json()["model_id"] == mdata["model_id"]

    # 4. POST /api/upload/data-model/validate-relationship
    val_payload = {
        "left_dataset": "customers.csv",
        "left_column": "customer_id",
        "right_dataset": "orders.csv",
        "right_column": "customer_id",
        "relationship_type": "one_to_many",
    }
    val_res = client.post("/api/upload/data-model/validate-relationship", json=val_payload)
    assert val_res.status_code == 200
    assert val_res.json()["valid"] is True

    # 5. DELETE /api/upload/data-model/relationships/{relationship_id}
    del_res = client.delete("/api/upload/data-model/relationships/rel_test_api")
    assert del_res.status_code == 200
    del_data = del_res.json()
    assert del_data["summary"]["relationship_count"] == 0
    assert del_data["summary"]["independent_count"] == 2
