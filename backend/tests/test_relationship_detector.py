import io
import pytest
import pandas as pd
from backend.app.analytics.relationship_detector import RelationshipDetector


def test_1_customers_and_orders_relationship():
    """TEST 1: customers.csv + orders.csv -> customer_id relationship detected (one_to_many, high confidence)."""
    df_customers = pd.DataFrame({
        "customer_id": ["C01", "C02", "C03", "C04"],
        "name": ["Aarav", "Diya", "Rohan", "Pooja"],
        "city": ["Mumbai", "Delhi", "Bengaluru", "Chennai"],
    })
    df_orders = pd.DataFrame({
        "order_id": ["ORD1", "ORD2", "ORD3", "ORD4", "ORD5"],
        "customer_id": ["C01", "C02", "C01", "C03", "C02"],
        "amount": [1200.0, 450.0, 3100.0, 890.0, 2200.0],
    })

    datasets = [
        {"df": df_customers, "filename": "customers.csv", "dataset_id": "ds_customers"},
        {"df": df_orders, "filename": "orders.csv", "dataset_id": "ds_orders"},
    ]

    relationships = RelationshipDetector.detect_relationships(datasets)
    assert len(relationships) >= 1

    # Find customer_id relationship
    cust_rel = next((r for r in relationships if "customer_id" in r.left_column and "customer_id" in r.right_column), None)
    assert cust_rel is not None
    assert cust_rel.confidence >= 85
    assert cust_rel.match_level == "Strong Match"
    assert cust_rel.relationship_type == "one_to_many"
    assert cust_rel.left_dataset == "customers.csv"
    assert cust_rel.right_dataset == "orders.csv"
    assert cust_rel.signals.left_unique is True
    assert cust_rel.signals.right_unique is False
    assert cust_rel.signals.type_compatible is True


def test_2_orders_and_order_items_relationship():
    """TEST 2: orders.csv + order_items.csv -> order_id relationship detected (one_to_many)."""
    df_orders = pd.DataFrame({
        "order_id": ["O101", "O102", "O103"],
        "customer_id": ["C1", "C2", "C1"],
        "order_date": ["2024-01-01", "2024-01-02", "2024-01-03"],
    })
    df_items = pd.DataFrame({
        "item_id": [1, 2, 3, 4],
        "order_id": ["O101", "O101", "O102", "O103"],
        "product_id": ["P1", "P2", "P1", "P3"],
        "price": [10.0, 20.0, 15.0, 30.0],
    })

    datasets = [
        {"df": df_orders, "filename": "orders.csv", "dataset_id": "ds_orders"},
        {"df": df_items, "filename": "order_items.csv", "dataset_id": "ds_items"},
    ]

    relationships = RelationshipDetector.detect_relationships(datasets)
    assert len(relationships) >= 1

    order_rel = next((r for r in relationships if r.left_column == "order_id" and r.right_column == "order_id"), None)
    assert order_rel is not None
    assert order_rel.confidence >= 85
    assert order_rel.relationship_type == "one_to_many"
    assert order_rel.left_dataset == "orders.csv"
    assert order_rel.right_dataset == "order_items.csv"


def test_3_products_and_order_items_relationship():
    """TEST 3: products.csv + order_items.csv -> product_id relationship detected."""
    df_products = pd.DataFrame({
        "product_id": ["P1", "P2", "P3", "P4"],
        "product_name": ["Laptop", "Mouse", "Keyboard", "Monitor"],
        "category": ["Electronics", "Accessories", "Accessories", "Electronics"],
    })
    df_items = pd.DataFrame({
        "item_id": [1, 2, 3, 4, 5],
        "order_id": ["O1", "O1", "O2", "O3", "O3"],
        "product_id": ["P1", "P2", "P1", "P3", "P2"],
        "quantity": [1, 2, 1, 1, 3],
    })

    datasets = [
        {"df": df_products, "filename": "products.csv", "dataset_id": "ds_products"},
        {"df": df_items, "filename": "order_items.csv", "dataset_id": "ds_items"},
    ]

    relationships = RelationshipDetector.detect_relationships(datasets)
    prod_rel = next((r for r in relationships if r.left_column == "product_id" and r.right_column == "product_id"), None)
    assert prod_rel is not None
    assert prod_rel.confidence >= 85
    assert prod_rel.relationship_type == "one_to_many"


def test_4_customers_and_products_no_relationship():
    """TEST 4: customers.csv + products.csv -> No strong relationship unless evidence actually exists."""
    df_customers = pd.DataFrame({
        "customer_id": ["C1", "C2", "C3"],
        "customer_name": ["Alice", "Bob", "Charlie"],
        "city": ["Mumbai", "Delhi", "Bengaluru"],
    })
    df_products = pd.DataFrame({
        "product_id": ["P1", "P2", "P3"],
        "product_name": ["Laptop", "Mouse", "Keyboard"],
        "price": [50000, 500, 1500],
    })

    datasets = [
        {"df": df_customers, "filename": "customers.csv"},
        {"df": df_products, "filename": "products.csv"},
    ]

    relationships = RelationshipDetector.detect_relationships(datasets)
    assert len(relationships) == 0


def test_5_completely_unrelated_datasets():
    """TEST 5: Two completely unrelated datasets -> 'No strong relationships detected'."""
    df_students = pd.DataFrame({
        "student_id": ["S101", "S102", "S103"],
        "major": ["CS", "Math", "Physics"],
        "gpa": [3.8, 3.5, 3.9],
    })
    df_vehicles = pd.DataFrame({
        "vin_number": ["V9001", "V9002", "V9003"],
        "make": ["Toyota", "Honda", "Ford"],
        "mileage": [45000, 32000, 78000],
    })

    datasets = [
        {"df": df_students, "filename": "students.csv"},
        {"df": df_vehicles, "filename": "vehicles.csv"},
    ]

    relationships = RelationshipDetector.detect_relationships(datasets)
    assert len(relationships) == 0


def test_6_incompatible_data_types_rejected():
    """TEST 6: Same column name but incompatible data types -> excluded or low confidence."""
    df_a = pd.DataFrame({
        "record_id": pd.to_datetime(["2024-01-01", "2024-01-02", "2024-01-03"]),
        "value": [10, 20, 30],
    })
    df_b = pd.DataFrame({
        "record_id": [101, 102, 103],
        "status": ["active", "pending", "closed"],
    })

    datasets = [
        {"df": df_a, "filename": "table_a.csv"},
        {"df": df_b, "filename": "table_b.csv"},
    ]

    relationships = RelationshipDetector.detect_relationships(datasets)
    assert len(relationships) == 0


def test_7_generic_id_false_positive_protection():
    """TEST 7: Same generic column 'id' in multiple files without entity link -> protected against false positive."""
    df_customers = pd.DataFrame({
        "id": [1, 2, 3, 4, 5],
        "name": ["Aarav", "Diya", "Rohan", "Pooja", "Vikram"],
    })
    df_products = pd.DataFrame({
        "id": [1, 2, 3, 4, 5],
        "product_name": ["Pen", "Notebook", "Eraser", "Ruler", "Pencil"],
    })

    datasets = [
        {"df": df_customers, "filename": "customers.csv"},
        {"df": df_products, "filename": "products.csv"},
    ]

    relationships = RelationshipDetector.detect_relationships(datasets)
    # Generic 'id' in customers and products represents different entities -> must not produce a relationship
    assert len(relationships) == 0


def test_8_one_to_many_cardinality():
    """TEST 8: One-to-many example verification."""
    df_depts = pd.DataFrame({
        "department_id": [10, 20, 30],
        "dept_name": ["Engineering", "HR", "Finance"],
    })
    df_emps = pd.DataFrame({
        "emp_id": [1, 2, 3, 4, 5],
        "department_id": [10, 10, 20, 10, 30],
        "name": ["Alice", "Bob", "Charlie", "David", "Eve"],
    })

    datasets = [
        {"df": df_depts, "filename": "departments.csv"},
        {"df": df_emps, "filename": "employees.csv"},
    ]

    relationships = RelationshipDetector.detect_relationships(datasets)
    dept_rel = next((r for r in relationships if r.left_column == "department_id" and r.right_column == "department_id"), None)
    assert dept_rel is not None
    assert dept_rel.relationship_type == "one_to_many"
    assert dept_rel.left_dataset == "departments.csv"
    assert dept_rel.right_dataset == "employees.csv"


def test_9_high_null_key_confidence_penalized():
    """TEST 9: High-null key reduces confidence."""
    df_clean = pd.DataFrame({
        "customer_id": ["C1", "C2", "C3", "C4"],
        "name": ["A", "B", "C", "D"],
    })
    df_nulls = pd.DataFrame({
        "order_id": ["O1", "O2", "O3", "O4", "O5", "O6"],
        "customer_id": ["C1", None, None, None, "C2", None],
    })

    datasets = [
        {"df": df_clean, "filename": "customers.csv"},
        {"df": df_nulls, "filename": "orders.csv"},
    ]

    relationships = RelationshipDetector.detect_relationships(datasets)
    if relationships:
        assert relationships[0].confidence < 80


def test_10_single_dataset_returns_empty():
    """TEST 10: Single dataset does not run relationship detection."""
    df = pd.DataFrame({"id": [1, 2], "val": [10, 20]})
    datasets = [{"df": df, "filename": "data.csv"}]
    assert RelationshipDetector.detect_relationships(datasets) == []


def test_relationship_api_endpoints(client):
    """Test POST /api/upload/relationships-with-files endpoint directly."""
    csv_customers = "customer_id,name\nC1,Khush\nC2,Alex\n"
    csv_orders = "order_id,customer_id,amount\nORD1,C1,500\nORD2,C1,750\nORD3,C2,1200\n"

    files = [
        ("files", ("customers.csv", io.BytesIO(csv_customers.encode("utf-8")), "text/csv")),
        ("files", ("orders.csv", io.BytesIO(csv_orders.encode("utf-8")), "text/csv")),
    ]

    response = client.post("/api/upload/relationships-with-files", files=files)
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert data["dataset_count"] == 2
    assert data["relationship_count"] >= 1

    rel = data["relationships"][0]
    assert rel["relationship_type"] == "one_to_many"
    assert rel["confidence"] >= 85
    assert rel["status"] == "suggested"
    assert len(rel["explanation"]) >= 3
    assert rel["signals"]["name_similarity"] >= 0.9
    assert rel["signals"]["type_compatible"] is True


def test_relationship_detection_from_cached_dataset_ids(client):
    """Test full workflow: POST /api/upload/profile-multiple -> POST /api/upload/relationships with dataset_ids."""
    csv_customers = "customer_id,name\nC1,Khush\nC2,Alex\n"
    csv_orders = "order_id,customer_id,amount\nORD1,C1,500\nORD2,C1,750\nORD3,C2,1200\n"

    files = [
        ("files", ("customers.csv", io.BytesIO(csv_customers.encode("utf-8")), "text/csv")),
        ("files", ("orders.csv", io.BytesIO(csv_orders.encode("utf-8")), "text/csv")),
    ]

    # Step 1: Profile multiple datasets
    profile_res = client.post("/api/upload/profile-multiple", files=files)
    assert profile_res.status_code == 200
    pdata = profile_res.json()
    assert pdata["success"] is True
    assert pdata["dataset_count"] == 2
    ds_ids = [d["dataset_id"] for d in pdata["datasets"]]

    # Step 2: Detect relationships using cached IDs
    rel_res = client.post("/api/upload/relationships", json={"dataset_ids": ds_ids})
    assert rel_res.status_code == 200
    rdata = rel_res.json()
    assert rdata["success"] is True
    assert rdata["dataset_count"] == 2
    assert rdata["relationship_count"] >= 1
    rel = rdata["relationships"][0]
    assert rel["left_column"] == "customer_id"
    assert rel["right_column"] == "customer_id"
    assert rel["relationship_type"] == "one_to_many"
    assert rel["confidence"] >= 85
    assert rel["status"] == "suggested"

