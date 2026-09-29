import io
import json
import pytest
import pandas as pd
import numpy as np


def test_sales_dataset_intelligence(client):
    """
    Test 1: Sales dataset.
    Verifies detection of monetary values, quantities, dates, customers, categories,
    payment methods, geography, and generation of relevant domain modules (sales-revenue, geography, etc.).
    """
    csv_content = (
        "order_id,order_date,customer_name,product_category,sales_amount,quantity,payment_method,state\n"
        "ORD-001,2023-01-15,Amit Shah,Electronics,45000,1,UPI,Maharashtra\n"
        "ORD-002,2023-01-18,Priya Patel,Apparel,2400,2,Credit Card,Gujarat\n"
        "ORD-003,2023-02-05,Rahul Roy,Home & Kitchen,8900,1,Net Banking,Karnataka\n"
        "ORD-004,2023-02-12,Sneha Das,Electronics,12500,1,Debit Card,West Bengal\n"
        "ORD-005,2023-03-01,Vikram Nair,Apparel,4200,3,Cash on Delivery,Kerala\n"
        "ORD-006,2023-03-10,Ananya Iyer,Beauty,1800,2,UPI,Tamil Nadu\n"
    )
    files = {"file": ("sales_data.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post("/api/upload/analyze", files=files)
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert data["dataset"]["rows"] == 6

    # Verify column detections
    col_map = {c["name"]: c for c in data["detected_columns"]}
    assert col_map["order_id"]["is_identifier"] is True
    assert col_map["order_date"]["type"] == "datetime"
    assert col_map["order_date"]["semantic_role"] == "date"
    assert col_map["sales_amount"]["type"] == "numeric"
    assert col_map["sales_amount"]["semantic_role"] == "monetary_value"
    assert col_map["quantity"]["semantic_role"] == "quantity"
    assert col_map["customer_name"]["semantic_role"] == "customer"
    assert col_map["product_category"]["semantic_role"] == "category"
    assert col_map["payment_method"]["semantic_role"] == "payment_method"
    assert col_map["state"]["semantic_role"] == "geography"

    # Verify capabilities
    caps = data["capabilities"]
    assert caps["time_series"] is True
    assert caps["geography"] is True
    assert caps["categorical_distribution"] is True
    assert caps["correlations"] is True

    # Verify module candidates
    module_ids = [m["id"] for m in data["modules"]]
    assert "overview" in module_ids
    assert "sales-revenue" in module_ids
    assert "trends" in module_ids
    assert "products" in module_ids
    assert "categories" in module_ids
    assert "customers" in module_ids
    assert "geography" in module_ids
    assert "payments" in module_ids
    assert "insights" in module_ids
    # Should NOT have student module
    assert "academic-performance" not in module_ids

    # Verify statistical analytics
    analytics = data["analytics"]
    assert analytics is not None
    assert analytics["value_metric"] is not None
    assert analytics["value_metric"]["column"] == "sales_amount"
    assert analytics["value_metric"]["statistics"]["total"] == 74800.0
    assert analytics["value_metric"]["statistics"]["count"] == 6
    assert analytics["overview"]["kpis"] is not None
    assert len(analytics["overview"]["kpis"]) >= 4
    assert analytics["trends"]["available"] is True
    assert len(analytics["trends"]["data"]) > 0
    assert analytics["distributions"]["available"] is True
    assert analytics["geography"]["available"] is True
    assert len(analytics["insights"]) >= 3


def test_student_dataset_intelligence(client):
    """
    Test 2: Student dataset.
    Verifies detection of student entity, scores, grades, department, and ensures
    sales-revenue and geography modules are NOT generated, while academic-performance is generated.
    """
    csv_content = (
        "student_id,student_name,department,semester,marks,attendance_percentage,grade\n"
        "STU-101,Aarav Kumar,Computer Science,4,88.5,92.0,A\n"
        "STU-102,Diya Sen,Mechanical Engineering,4,74.0,85.5,B\n"
        "STU-103,Rohan Gupta,Electrical Engineering,4,91.0,96.0,A+\n"
        "STU-104,Pooja Hegde,Computer Science,4,65.0,78.0,C\n"
        "STU-105,Vikram Malhotra,Civil Engineering,4,82.0,88.0,B+\n"
        "STU-106,Meera Nair,Computer Science,4,95.5,98.0,A+\n"
    )
    files = {"file": ("students.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post("/api/upload/analyze", files=files)
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True

    col_map = {c["name"]: c for c in data["detected_columns"]}
    assert col_map["student_id"]["is_identifier"] is True
    assert col_map["student_name"]["semantic_role"] == "student"
    assert col_map["department"]["semantic_role"] == "department"
    assert col_map["marks"]["semantic_role"] == "score"
    assert col_map["attendance_percentage"]["semantic_role"] == "score"

    module_ids = [m["id"] for m in data["modules"]]
    assert "overview" in module_ids
    assert "academic-performance" in module_ids
    assert "attendance" in module_ids
    assert "departments" in module_ids
    assert "students" in module_ids
    assert "insights" in module_ids

    # Sales or geography MUST NOT be present
    assert "sales-revenue" not in module_ids
    assert "geography" not in module_ids

    # Verify statistical analytics
    analytics = data["analytics"]
    assert analytics is not None
    assert analytics["value_metric"] is None  # Academic dataset has no monetary revenue
    assert analytics["primary_metric"] is not None
    assert analytics["primary_metric"]["column"] == "marks"
    assert analytics["primary_metric"]["statistics"]["average"] == 82.67
    assert analytics["primary_metric"]["statistics"]["max"] == 95.5
    assert analytics["primary_metric"]["statistics"]["min"] == 65.0


def test_employee_dataset_intelligence(client):
    """
    Test 3: Employee dataset.
    Verifies detection of employee entities, departments, salary/compensation, ratings,
    and generation of employee and compensation modules.
    """
    csv_content = (
        "emp_id,employee_name,department,designation,hire_date,salary,performance_rating\n"
        "EMP-001,Rajesh Khanna,Engineering,Senior Architect,2020-04-01,165000,4.8\n"
        "EMP-002,Simran Kaur,Human Resources,HR Manager,2021-06-15,85000,4.2\n"
        "EMP-003,Karan Johar,Marketing,Campaign Lead,2022-01-10,95000,3.9\n"
        "EMP-004,Neha Sharma,Engineering,Backend Engineer,2022-09-01,110000,4.5\n"
        "EMP-005,Arjun Rampal,Finance,Financial Analyst,2021-11-20,92000,4.0\n"
    )
    files = {"file": ("employees.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post("/api/upload/analyze", files=files)
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True

    col_map = {c["name"]: c for c in data["detected_columns"]}
    assert col_map["emp_id"]["is_identifier"] is True
    assert col_map["employee_name"]["semantic_role"] == "employee"
    assert col_map["department"]["semantic_role"] == "department"
    assert col_map["salary"]["semantic_role"] == "monetary_value"
    assert col_map["performance_rating"]["semantic_role"] == "rating"

    module_ids = [m["id"] for m in data["modules"]]
    assert "overview" in module_ids
    assert "employees" in module_ids
    assert "compensation" in module_ids
    assert "departments" in module_ids
    assert "trends" in module_ids

    # Verify statistical analytics
    analytics = data["analytics"]
    assert analytics is not None
    assert analytics["value_metric"] is not None
    assert analytics["value_metric"]["column"] == "salary"
    assert analytics["value_metric"]["statistics"]["total"] == 547000.0
    assert analytics["value_metric"]["statistics"]["average"] == 109400.0
    assert analytics["trends"]["available"] is True
    assert analytics["correlations"]["available"] is True


def test_dataset_without_date(client):
    """
    Test 4: Dataset without date dimension.
    Verifies that capabilities.time_series is False and 'trends' module is NOT generated.
    """
    csv_content = (
        "customer_id,age,annual_income,spending_score\n"
        "CUST-001,28,65000,78\n"
        "CUST-002,42,120000,45\n"
        "CUST-003,35,85000,82\n"
        "CUST-004,22,30000,60\n"
        "CUST-005,58,95000,30\n"
    )
    files = {"file": ("customer_segments.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post("/api/upload/analyze", files=files)
    assert response.status_code == 200

    data = response.json()
    assert data["capabilities"]["time_series"] is False
    module_ids = [m["id"] for m in data["modules"]]
    assert "trends" not in module_ids


def test_dataset_with_multiple_numeric_correlations(client):
    """
    Test 5: Dataset with multiple numeric columns.
    Verifies capabilities.correlations is True and 'correlations' module is included.
    """
    csv_content = (
        "id,feature_a,feature_b,feature_c,target\n"
        "1,10.5,20.1,5.2,100.2\n"
        "2,12.3,18.4,6.1,105.4\n"
        "3,15.1,15.2,7.4,112.8\n"
        "4,17.8,12.0,8.3,120.1\n"
        "5,20.2,9.8,9.5,128.6\n"
    )
    files = {"file": ("experiment_metrics.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post("/api/upload/analyze", files=files)
    assert response.status_code == 200

    data = response.json()
    assert data["capabilities"]["correlations"] is True
    assert data["capabilities"]["outliers"] is True
    module_ids = [m["id"] for m in data["modules"]]
    assert "correlations" in module_ids
    assert "outliers" in module_ids


def test_dataset_with_missing_values(client):
    """
    Test 6: Dataset with missing values.
    Verifies that missing values are handled safely without crashing.
    """
    csv_content = (
        "order_id,amount,category,region\n"
        "101,150.0,Retail,North\n"
        "102,,Retail,South\n"
        "103,240.5,,East\n"
        "104,80.0,Wholesale,\n"
        "105,,,West\n"
    )
    files = {"file": ("missing_data.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post("/api/upload/analyze", files=files)
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert data["profile"]["summary"]["total_missing_values"] > 0
    assert len(data["detected_columns"]) == 4



def test_dataset_with_high_cardinality_identifiers(client):
    """
    Test 7: Dataset with high-cardinality ID columns (UUIDs and structured codes).
    Verifies columns are flagged as is_identifier=True and type='identifier'.
    """
    csv_content = (
        "uuid_code,user_badge,score\n"
        "c9a646d3-9c61-4cc9-bc16-4e0f322ca7ac,BADGE-901,85\n"
        "d8b746e4-0d72-4dd0-cd27-5f1e433db8bd,BADGE-902,92\n"
        "e7c847f5-1e83-4ee1-de38-6a2f544ec9ce,BADGE-903,78\n"
        "f6d94806-2f94-4ff2-ef49-7b3a655fd0df,BADGE-904,65\n"
        "a5ea4917-3005-4003-f05a-8c4b766ae1ea,BADGE-905,90\n"
    )
    files = {"file": ("uuids.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post("/api/upload/analyze", files=files)
    assert response.status_code == 200

    data = response.json()
    col_map = {c["name"]: c for c in data["detected_columns"]}
    assert col_map["uuid_code"]["is_identifier"] is True
    assert col_map["uuid_code"]["type"] == "identifier"
    assert col_map["user_badge"]["is_identifier"] is True
    assert col_map["user_badge"]["type"] == "identifier"


def test_dataset_filter_and_recalculate(client):
    """
    Test 8: Upload dataset, apply filters, and verify analytics recalculation on the filtered slice.
    """
    csv_content = (
        "order_id,product_category,sales_amount,state\n"
        "ORD-001,Electronics,45000,Maharashtra\n"
        "ORD-002,Apparel,2400,Gujarat\n"
        "ORD-003,Electronics,12500,West Bengal\n"
        "ORD-004,Apparel,4200,Kerala\n"
        "ORD-005,Electronics,8900,Karnataka\n"
        "ORD-006,Beauty,1800,Tamil Nadu\n"
    )
    files = {"file": ("sales_data.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    upload_res = client.post("/api/upload/analyze", files=files)
    assert upload_res.status_code == 200
    upload_data = upload_res.json()
    dataset_id = upload_data["dataset_id"]
    assert dataset_id is not None
    assert len(upload_data["available_filters"]) > 0
    assert "why_this_matters" in upload_data["analytics"]

    # Total before filter
    assert upload_data["analytics"]["value_metric"]["statistics"]["total"] == 74800.0

    # Apply filter: product_category = ["Electronics"]
    filter_payload = {
        "dataset_id": dataset_id,
        "filters": {
            "product_category": ["Electronics"],
        },
    }
    filter_res = client.post("/api/upload/filter", json=filter_payload)
    assert filter_res.status_code == 200
    filter_data = filter_res.json()

    assert filter_data["total_rows"] == 6
    assert filter_data["filtered_rows"] == 3
    assert filter_data["percentage_of_total"] == 50.0
    assert filter_data["is_filtered"] is True

    # Recalculated total sales for Electronics: 45000 + 12500 + 8900 = 66400
    electronics_total = filter_data["analytics"]["value_metric"]["statistics"]["total"]
    assert electronics_total == 66400.0
    assert filter_data["analytics"]["value_metric"]["statistics"]["count"] == 3


def test_compare_segments(client):
    """
    Test 9: Compare two segments side-by-side.
    Verifies metric stats, row count shares, differences, and takeaways.
    """
    csv_content = (
        "emp_id,department,salary,experience\n"
        "E1,Engineering,120000,5\n"
        "E2,Engineering,140000,8\n"
        "E3,Engineering,110000,4\n"
        "E4,Sales,80000,3\n"
        "E5,Sales,90000,6\n"
        "E6,Sales,70000,2\n"
    )
    files = {"file": ("employees.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    upload_res = client.post("/api/upload/analyze", files=files)
    assert upload_res.status_code == 200
    dataset_id = upload_res.json()["dataset_id"]

    compare_payload = {
        "dataset_id": dataset_id,
        "dimension": "department",
        "segment_a": "Engineering",
        "segment_b": "Sales",
    }
    compare_res = client.post("/api/upload/compare-segments", json=compare_payload)
    assert compare_res.status_code == 200
    data = compare_res.json()

    assert data["success"] is True
    assert data["segment_a"]["name"] == "Engineering"
    assert data["segment_a"]["rows"] == 3
    assert data["segment_a"]["percentage_of_total"] == 50.0
    assert data["segment_b"]["name"] == "Sales"
    assert data["segment_b"]["rows"] == 3

    # Mean salary for Engineering is (120k + 140k + 110k)/3 = 123,333.33
    # Mean salary for Sales is (80k + 90k + 70k)/3 = 80,000.00
    salary_comp = next((m for m in data["metrics"] if m["metric"] == "salary"), None)
    assert salary_comp is not None
    assert salary_comp["a_mean"] > salary_comp["b_mean"]
    assert salary_comp["mean_difference"] > 0
    assert len(data["takeaways"]) > 0


def test_unusual_values_investigation_repositioning(client):
    """
    Test 10: Unusual Values repositioning as secondary investigation.
    Verifies module title is 'Unusual Values', category is 'investigate',
    affected_records is correctly computed in outlier overview,
    and factual non-alarmist insight phrasing is generated.
    """
    csv_content = (
        "id,feature_a,feature_b,category\n"
        "1,10.0,50.0,CatA\n"
        "2,11.0,52.0,CatA\n"
        "3,10.5,49.0,CatA\n"
        "4,12.0,51.0,CatB\n"
        "5,9.5,48.0,CatB\n"
        "6,11.5,50.5,CatB\n"
        "7,10.2,49.5,CatA\n"
        "8,10.8,51.2,CatA\n"
        "9,100.0,50.0,CatB\n"  # Extreme outlier in feature_a (row 9)
        "10,10.1,500.0,CatB\n"  # Extreme outlier in feature_b (row 10)
    )
    files = {"file": ("investigation_data.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post("/api/upload/analyze", files=files)
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True

    # 1. Module candidate checks
    outlier_mod = next((m for m in data["modules"] if m["id"] == "outliers"), None)
    assert outlier_mod is not None
    assert outlier_mod["title"] == "Unusual Values"
    assert outlier_mod["category"] == "investigate"
    assert outlier_mod["icon"] == "alert-triangle"

    # 2. Statistical calculation checks
    outliers_data = data["analytics"]["outliers"]
    assert outliers_data["available"] is True
    overview = outliers_data["overview"]
    assert overview is not None
    assert overview["total_anomalies"] >= 2
    # Rows 9 and 10 have unusual values -> affected_records == 2
    assert overview["affected_records"] == 2
    assert overview["affected_features"] >= 1

    # 3. Insights checks
    insights = data["analytics"]["insights"]
    unusual_insight = next((i for i in insights if "unusual values" in i.lower()), None)
    assert unusual_insight is not None


def test_smart_filters_global_search_date_preset_and_metric_selection(client):
    """
    Test 10: Verify Smart Filters features:
    - Global text search (_search)
    - Relative date presets (this_month)
    - Boolean filtering
    - Primary metric dynamic switching override
    """
    csv_content = (
        "order_id,product_name,category,revenue,quantity,order_date,is_active\n"
        "ORD-101,Titan Watch,Accessories,15000,2,2024-05-02,True\n"
        "ORD-102,Cotton Shirt,Apparel,2500,5,2024-05-10,True\n"
        "ORD-103,Smart LED TV,Electronics,45000,1,2024-05-15,False\n"
        "ORD-104,Leather Belt,Accessories,1200,3,2024-04-12,True\n"
        "ORD-105,Denim Jeans,Apparel,3200,4,2024-04-20,True\n"
        "ORD-106,Bluetooth Speaker,Electronics,6000,3,2024-05-28,True\n"
    )
    files = {"file": ("retail_orders.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    upload_res = client.post("/api/upload/analyze", files=files)
    assert upload_res.status_code == 200
    upload_data = upload_res.json()
    dataset_id = upload_data["dataset_id"]
    assert dataset_id is not None

    # Check that available_filters prioritizing is in place
    available_filters = upload_data["available_filters"]
    assert len(available_filters) >= 4
    primary_filters = [f for f in available_filters if f.get("is_primary")]
    assert len(primary_filters) >= 2  # High value filters flagged as primary

    # 1. Test Global Search (_search) for "Watch"
    search_res = client.post("/api/upload/filter", json={
        "dataset_id": dataset_id,
        "filters": {"_search": "Watch"},
    })
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert search_data["filtered_rows"] == 1
    assert search_data["is_filtered"] is True
    assert "Titan Watch" in search_data["analytics"]["rankings"]["rankings"][0]["items"][0]["name"]

    # 2. Test Relative Date Preset: "this_month" (May 2024 since max date is 2024-05-28)
    preset_res = client.post("/api/upload/filter", json={
        "dataset_id": dataset_id,
        "filters": {"order_date": {"preset": "this_month"}},
    })
    assert preset_res.status_code == 200
    preset_data = preset_res.json()
    # 4 orders in May (101, 102, 103, 106)
    assert preset_data["filtered_rows"] == 4
    assert preset_data["is_filtered"] is True

    # 3. Test Boolean Filtering: is_active = True
    bool_res = client.post("/api/upload/filter", json={
        "dataset_id": dataset_id,
        "filters": {"is_active": True},
    })
    assert bool_res.status_code == 200
    bool_data = bool_res.json()
    # 5 active orders (101, 102, 104, 105, 106)
    assert bool_data["filtered_rows"] == 5

    # 4. Test Primary Metric Switching: switch primary_metric to "quantity"
    metric_res = client.post("/api/upload/filter", json={
        "dataset_id": dataset_id,
        "filters": {},
        "primary_metric": "quantity",
    })
    assert metric_res.status_code == 200
    metric_data = metric_res.json()
    # Analytics primary_metric is now quantity
    assert metric_data["analytics"]["primary_metric"]["column"] == "quantity"
    # Total quantity: 2 + 5 + 1 + 3 + 4 + 3 = 18
    assert metric_data["analytics"]["primary_metric"]["statistics"]["total"] == 18.0


