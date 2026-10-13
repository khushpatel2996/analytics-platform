import pandas as pd
import pytest
from starlette.testclient import TestClient

from backend.app.analytics.cross_dataset_engine import CrossDatasetEngine
from backend.app.analytics.data_model_builder import DataModelBuilder
from backend.app.analytics.dataset_cache import dataset_cache
from backend.app.main import app
from backend.app.schemas.cross_dataset import CrossDatasetQueryRequest
from backend.app.schemas.upload import RelationshipCandidate, RelationshipSignals


@pytest.fixture(autouse=True)
def clear_cache():
    dataset_cache._cache.clear()
    dataset_cache.clear_data_model()
    dataset_cache.clear_cross_dataset_analytics()
    yield
    dataset_cache._cache.clear()
    dataset_cache.clear_data_model()
    dataset_cache.clear_cross_dataset_analytics()


def make_candidate(
    rel_id: str,
    left_ds: str,
    left_col: str,
    right_ds: str,
    right_col: str,
    rel_type: str = "one_to_many",
) -> RelationshipCandidate:
    return RelationshipCandidate(
        relationship_id=rel_id,
        left_dataset=left_ds,
        left_column=left_col,
        right_dataset=right_ds,
        right_column=right_col,
        relationship_type=rel_type,
        confidence=95,
        match_level="High",
        signals=RelationshipSignals(
            name_similarity=1.0,
            type_compatible=True,
            value_overlap=1.0,
            left_unique=True,
            right_unique=False,
            left_null_rate=0.0,
            right_null_rate=0.0,
        ),
        explanation=["Confirmed relationship for testing"],
        status="accepted",
    )


def test_ecommerce_cross_dataset_analytics():
    """Test 4-table e-commerce data model: customers -> orders -> order_items -> products"""
    df_customers = pd.DataFrame({
        "customer_id": [1, 2, 3],
        "name": ["Alice Smith", "Bob Jones", "Charlie Brown"],
        "city": ["Mumbai", "Delhi", "Bengaluru"],
        "segment": ["Corporate", "Consumer", "Consumer"],
    })
    df_orders = pd.DataFrame({
        "order_id": [101, 102, 103],
        "customer_id": [1, 2, 1],
        "order_date": ["2024-01-15", "2024-02-10", "2024-03-05"],
        "amount": [1500.0, 2500.0, 3000.0],
    })
    df_items = pd.DataFrame({
        "order_id": [101, 101, 102, 103],
        "product_id": ["P1", "P2", "P1", "P3"],
        "quantity": [1, 2, 1, 3],
    })
    df_products = pd.DataFrame({
        "product_id": ["P1", "P2", "P3"],
        "product_name": ["Laptop", "Mouse", "Keyboard"],
        "category": ["Electronics", "Accessories", "Accessories"],
        "price": [1000.0, 250.0, 1000.0],
    })

    datasets = [
        {"df": df_customers, "filename": "customers.csv", "dataset_id": "ds_cust"},
        {"df": df_orders, "filename": "orders.csv", "dataset_id": "ds_ord"},
        {"df": df_items, "filename": "order_items.csv", "dataset_id": "ds_items"},
        {"df": df_products, "filename": "products.csv", "dataset_id": "ds_prod"},
    ]

    accepted = [
        make_candidate("r1", "customers.csv", "customer_id", "orders.csv", "customer_id", "one_to_many"),
        make_candidate("r2", "orders.csv", "order_id", "order_items.csv", "order_id", "one_to_many"),
        make_candidate("r3", "products.csv", "product_id", "order_items.csv", "product_id", "one_to_many"),
    ]

    model = DataModelBuilder.build_data_model(datasets, accepted)
    assert model.status in ["valid", "warning"]

    # Calculate cross-dataset analytics
    res = CrossDatasetEngine.generate_analytics_for_model(model, datasets)
    assert len(res.groups) == 1
    grp = res.groups[0]

    # Verify KPIs
    kpi_labels = [k.label for k in grp.kpis]
    assert any("Total Customers" in l for l in kpi_labels)
    assert any("Total Orders" in l for l in kpi_labels)
    assert any("Total Products" in l for l in kpi_labels)
    assert any("Revenue" in l for l in kpi_labels)
    assert any("Average Order Value" in l for l in kpi_labels)
    assert any("Units Sold" in l for l in kpi_labels)

    # Verify Trends (Date present)
    assert grp.has_time_dimension is True
    assert grp.trends is not None
    assert len(grp.trends.points) > 0

    # Verify Rankings
    assert len(grp.rankings) > 0

    # Verify Relationship Health
    assert len(grp.relationship_health) == 3
    for h in grp.relationship_health:
        assert h.matched_percentage > 0

    # Verify Factual Insights
    assert len(grp.insights) > 0


def test_dynamic_query_execution():
    """Test dynamic query between product_name and amount via shortest path"""
    df_orders = pd.DataFrame({
        "order_id": [101, 102],
        "amount": [500.0, 1000.0],
    })
    df_items = pd.DataFrame({
        "order_id": [101, 102],
        "product_id": ["P1", "P2"],
    })
    df_products = pd.DataFrame({
        "product_id": ["P1", "P2"],
        "product_name": ["Widget A", "Widget B"],
    })

    datasets = [
        {"df": df_orders, "filename": "orders.csv", "dataset_id": "ds_ord"},
        {"df": df_items, "filename": "order_items.csv", "dataset_id": "ds_items"},
        {"df": df_products, "filename": "products.csv", "dataset_id": "ds_prod"},
    ]

    accepted = [
        make_candidate("r1", "orders.csv", "order_id", "order_items.csv", "order_id", "one_to_many"),
        make_candidate("r2", "products.csv", "product_id", "order_items.csv", "product_id", "one_to_many"),
    ]

    model = DataModelBuilder.build_data_model(datasets, accepted)
    lookup = CrossDatasetEngine.create_dataset_lookup(datasets)

    req = CrossDatasetQueryRequest(
        dimension_dataset="products.csv",
        dimension_column="product_name",
        metric_dataset="orders.csv",
        metric_column="amount",
        aggregation="sum",
    )

    query_res = CrossDatasetEngine.execute_dynamic_query(req, model, lookup)
    assert len(query_res.items) == 2
    assert query_res.items[0].label in ["Widget A", "Widget B"]
    assert query_res.items[0].value > 0


def test_generic_student_dataset():
    """Test generic educational dataset (students + classes)"""
    df_students = pd.DataFrame({
        "student_id": [1, 2, 3, 4],
        "name": ["Emma", "Liam", "Noah", "Olivia"],
        "class_id": ["C1", "C1", "C2", "C2"],
        "score": [85.0, 92.0, 78.0, 88.0],
    })
    df_classes = pd.DataFrame({
        "class_id": ["C1", "C2"],
        "class_name": ["Grade 10A", "Grade 10B"],
    })

    datasets = [
        {"df": df_students, "filename": "students.csv", "dataset_id": "ds_stu"},
        {"df": df_classes, "filename": "classes.csv", "dataset_id": "ds_cls"},
    ]

    accepted = [
        make_candidate("r1", "classes.csv", "class_id", "students.csv", "class_id", "one_to_many"),
    ]

    model = DataModelBuilder.build_data_model(datasets, accepted)
    res = CrossDatasetEngine.generate_analytics_for_model(model, datasets)
    assert len(res.groups) == 1
    grp = res.groups[0]
    # No date column -> has_time_dimension should be False
    assert grp.has_time_dimension is False
    assert grp.trends is None
    # KPIs should detect students and not invent revenue
    kpi_labels = [k.label for k in grp.kpis]
    assert any("Student" in l for l in kpi_labels)
    assert not any("Revenue" in l for l in kpi_labels)


def test_generic_employee_dataset():
    """Test generic employee and department dataset"""
    df_emp = pd.DataFrame({
        "employee_id": [101, 102, 103],
        "name": ["John", "Sarah", "David"],
        "department_id": ["D1", "D2", "D1"],
        "salary": [60000.0, 80000.0, 75000.0],
    })
    df_dept = pd.DataFrame({
        "department_id": ["D1", "D2"],
        "department_name": ["Engineering", "Marketing"],
    })

    datasets = [
        {"df": df_emp, "filename": "employees.csv", "dataset_id": "ds_emp"},
        {"df": df_dept, "filename": "departments.csv", "dataset_id": "ds_dept"},
    ]

    accepted = [
        make_candidate("r1", "departments.csv", "department_id", "employees.csv", "department_id", "one_to_many"),
    ]

    model = DataModelBuilder.build_data_model(datasets, accepted)
    res = CrossDatasetEngine.generate_analytics_for_model(model, datasets)
    assert len(res.groups) == 1
    grp = res.groups[0]
    kpi_labels = [k.label for k in grp.kpis]
    assert any("Payroll" in l or "Salary" in l for l in kpi_labels)


def test_two_connected_groups_and_independent_dataset():
    """Test model with two distinct groups and an independent orphan table"""
    df_cust = pd.DataFrame({"cust_id": [1, 2], "name": ["A", "B"]})
    df_ord = pd.DataFrame({"order_id": [10, 20], "cust_id": [1, 2]})
    df_emp = pd.DataFrame({"emp_id": [100, 200], "dept_id": [1, 1]})
    df_dept = pd.DataFrame({"dept_id": [1], "name": ["Ops"]})
    df_notes = pd.DataFrame({"note_id": [1, 2], "text": ["N1", "N2"]})

    datasets = [
        {"df": df_cust, "filename": "cust.csv", "dataset_id": "d1"},
        {"df": df_ord, "filename": "ord.csv", "dataset_id": "d2"},
        {"df": df_emp, "filename": "emp.csv", "dataset_id": "d3"},
        {"df": df_dept, "filename": "dept.csv", "dataset_id": "d4"},
        {"df": df_notes, "filename": "notes.csv", "dataset_id": "d5"},
    ]

    accepted = [
        make_candidate("r1", "cust.csv", "cust_id", "ord.csv", "cust_id", "one_to_many"),
        make_candidate("r2", "dept.csv", "dept_id", "emp.csv", "dept_id", "one_to_many"),
    ]

    model = DataModelBuilder.build_data_model(datasets, accepted)
    assert len(model.connected_components) == 2
    assert len(model.independent_datasets) == 1

    res = CrossDatasetEngine.generate_analytics_for_model(model, datasets)
    assert len(res.groups) == 2
    assert len(res.independent_datasets) == 1
    assert res.independent_datasets[0]["filename"] == "notes.csv"


def test_api_cross_dataset_endpoints():
    """Test API POST and GET /api/upload/cross-dataset-analytics"""
    client = TestClient(app)

    df_a = pd.DataFrame({"id": [1, 2], "val": [10.0, 20.0]})
    df_b = pd.DataFrame({"ref_id": [1, 2], "amount": [100.0, 200.0]})

    # Register in cache
    dataset_cache.register_dataset(df_a, None, None, "ds_a")
    dataset_cache.register_dataset(df_b, None, None, "ds_b")

    # Build model first
    model_payload = {
        "dataset_ids": ["ds_a", "ds_b"],
        "accepted_relationships": [
            {
                "relationship_id": "r1",
                "left_dataset": "ds_a",
                "left_column": "id",
                "right_dataset": "ds_b",
                "right_column": "ref_id",
                "relationship_type": "one_to_one",
                "confidence": 95,
                "match_level": "High",
                "signals": {
                    "name_similarity": 0.8,
                    "type_compatible": True,
                    "value_overlap": 1.0,
                    "left_unique": True,
                    "right_unique": True,
                    "left_null_rate": 0.0,
                    "right_null_rate": 0.0,
                },
                "explanation": ["test"],
                "status": "accepted",
            }
        ],
    }

    resp = client.post("/api/upload/data-model", json=model_payload)
    assert resp.status_code == 200

    # Call POST /api/upload/cross-dataset-analytics
    resp_analytics = client.post("/api/upload/cross-dataset-analytics", json={})
    assert resp_analytics.status_code == 200
    data = resp_analytics.json()
    assert data["success"] is True
    assert len(data["groups"]) == 1

    # Call GET /api/upload/cross-dataset-analytics
    resp_get = client.get("/api/upload/cross-dataset-analytics")
    assert resp_get.status_code == 200
    assert resp_get.json()["success"] is True


def test_date_role_classification():
    """Verify semantic date classification distinguishes birth date from event and operational dates"""
    role, score, _ = CrossDatasetEngine.classify_date_column("Date_of_Birth")
    assert role == CrossDatasetEngine.DATE_ROLE_BIRTH
    assert score == 0

    role, score, _ = CrossDatasetEngine.classify_date_column("DOB")
    assert role == CrossDatasetEngine.DATE_ROLE_BIRTH
    assert score == 0

    role, score, _ = CrossDatasetEngine.classify_date_column("order_date")
    assert role == CrossDatasetEngine.DATE_ROLE_EVENT
    assert score == 100

    role, score, _ = CrossDatasetEngine.classify_date_column("sale_date")
    assert role == CrossDatasetEngine.DATE_ROLE_EVENT
    assert score == 100

    role, score, _ = CrossDatasetEngine.classify_date_column("created_at")
    assert role == CrossDatasetEngine.DATE_ROLE_CREATED
    assert score == 80


def test_geography_column_detection():
    """Verify is_geographic_column detects location fields including compound names"""
    assert CrossDatasetEngine.is_geographic_column("state") is True
    assert CrossDatasetEngine.is_geographic_column("State") is True
    assert CrossDatasetEngine.is_geographic_column("customer_city") is True
    assert CrossDatasetEngine.is_geographic_column("state_name") is True
    assert CrossDatasetEngine.is_geographic_column("pincode") is True
    assert CrossDatasetEngine.is_geographic_column("shipping_zip") is True
    assert CrossDatasetEngine.is_geographic_column("order_id") is False
    assert CrossDatasetEngine.is_geographic_column("amount") is False


def test_trend_prioritizes_order_date_over_dob():
    """When customers has Date_of_Birth and orders has order_date, trend picks order_date"""
    df_customers = pd.DataFrame({
        "customer_id": [1, 2, 3],
        "name": ["Alice", "Bob", "Charlie"],
        "Date_of_Birth": ["1990-05-12", "1985-08-20", "1995-12-01"],
    })
    df_orders = pd.DataFrame({
        "order_id": [101, 102, 103],
        "customer_id": [1, 2, 3],
        "order_date": ["2024-01-10", "2024-02-15", "2024-03-20"],
        "amount": [1200.0, 2400.0, 1800.0],
    })

    datasets = [
        {"df": df_customers, "filename": "customers.csv", "dataset_id": "ds_cust"},
        {"df": df_orders, "filename": "orders.csv", "dataset_id": "ds_ord"},
    ]
    accepted = [
        make_candidate("r1", "customers.csv", "customer_id", "orders.csv", "customer_id", "one_to_many"),
    ]
    model = DataModelBuilder.build_data_model(datasets, accepted)
    res = CrossDatasetEngine.generate_analytics_for_model(model, datasets)
    grp = res.groups[0]

    assert grp.has_event_date is True
    assert grp.trends is not None
    # Crucial assertion: Trend MUST pick order_date, NEVER Date_of_Birth!
    assert grp.trends.date_column == "order_date"
    assert grp.trends.dataset == "orders.csv"


def test_trend_excludes_dob_when_no_event_dates():
    """When only Date_of_Birth exists, auto trend is None and has_event_date is False"""
    df_customers = pd.DataFrame({
        "customer_id": [1, 2, 3],
        "name": ["Alice", "Bob", "Charlie"],
        "Date_of_Birth": ["1990-05-12", "1985-08-20", "1995-12-01"],
    })
    df_profiles = pd.DataFrame({
        "customer_id": [1, 2, 3],
        "status": ["Active", "Active", "Inactive"],
    })

    datasets = [
        {"df": df_customers, "filename": "customers.csv", "dataset_id": "ds_cust"},
        {"df": df_profiles, "filename": "profiles.csv", "dataset_id": "ds_prof"},
    ]
    accepted = [
        make_candidate("r1", "customers.csv", "customer_id", "profiles.csv", "customer_id", "one_to_one"),
    ]
    model = DataModelBuilder.build_data_model(datasets, accepted)
    res = CrossDatasetEngine.generate_analytics_for_model(model, datasets)
    grp = res.groups[0]

    # Crucial assertion: Auto business trend must NOT be generated for Date_of_Birth
    assert grp.trends is None
    assert grp.has_event_date is False
    # But it must be available for manual selection
    dob_field = next((d for d in grp.available_date_fields if d["column"] == "Date_of_Birth"), None)
    assert dob_field is not None
    assert dob_field["role"] == "BIRTH_DATE"
    assert dob_field["is_event_date"] is False


def test_geography_analysis_generated_across_datasets():
    """When customers has state and orders has amount, geography analysis card and rankings are produced"""
    df_customers = pd.DataFrame({
        "customer_id": [1, 2, 3],
        "state": ["Maharashtra", "Karnataka", "Delhi"],
    })
    df_orders = pd.DataFrame({
        "order_id": [101, 102, 103],
        "customer_id": [1, 2, 3],
        "amount": [5000.0, 7500.0, 2000.0],
    })

    datasets = [
        {"df": df_customers, "filename": "customers.csv", "dataset_id": "ds_cust"},
        {"df": df_orders, "filename": "orders.csv", "dataset_id": "ds_ord"},
    ]
    accepted = [
        make_candidate("r1", "customers.csv", "customer_id", "orders.csv", "customer_id", "one_to_many"),
    ]
    model = DataModelBuilder.build_data_model(datasets, accepted)
    res = CrossDatasetEngine.generate_analytics_for_model(model, datasets)
    grp = res.groups[0]

    assert grp.has_geo_dimension is True
    assert len(grp.available_geo_dimensions) > 0
    assert grp.available_geo_dimensions[0]["column"] == "state"

    # Analysis cards must include geography
    geo_card = next((c for c in grp.analyses if "geography" in c.id.lower()), None)
    assert geo_card is not None
    assert len(geo_card.data) > 0

    # Rankings must include state
    geo_rank = next((r for r in grp.rankings if "state" in r.dimension_column.lower()), None)
    assert geo_rank is not None


def test_dynamic_trend_execution_across_datasets():
    """Verify execute_dynamic_trend joins date and metric across connected datasets"""
    from backend.app.schemas.cross_dataset import CrossDatasetTrendRequest

    df_customers = pd.DataFrame({
        "customer_id": [1, 2, 3],
        "state": ["Maharashtra", "Karnataka", "Delhi"],
    })
    df_orders = pd.DataFrame({
        "order_id": [101, 102, 103],
        "customer_id": [1, 2, 3],
        "order_date": ["2023-01-15", "2023-02-20", "2023-03-10"],
        "amount": [5000.0, 7500.0, 2000.0],
    })

    datasets = [
        {"df": df_customers, "filename": "customers.csv", "dataset_id": "ds_cust"},
        {"df": df_orders, "filename": "orders.csv", "dataset_id": "ds_ord"},
    ]
    accepted = [
        make_candidate("r1", "customers.csv", "customer_id", "orders.csv", "customer_id", "one_to_many"),
    ]
    model = DataModelBuilder.build_data_model(datasets, accepted)
    dataset_lookup = {d["filename"]: d["df"] for d in datasets}

    req = CrossDatasetTrendRequest(
        date_dataset="orders.csv",
        date_column="order_date",
        metric_dataset="orders.csv",
        metric_column="amount",
        granularity="month",
    )
    trend = CrossDatasetEngine.execute_dynamic_trend(req, model, dataset_lookup)
    assert trend is not None
    assert len(trend.points) == 3
    assert trend.granularity == "month"


