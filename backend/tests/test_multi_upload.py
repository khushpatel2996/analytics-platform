import io
import json
import pytest
import pandas as pd


def test_multi_upload_two_csv_files(client):
    """Test uploading two distinct CSV files simultaneously."""
    customers_csv = (
        "customer_id,name,city,tier\n"
        "C01,Aarav,Mumbai,Gold\n"
        "C02,Diya,Delhi,Silver\n"
        "C03,Rohan,Bengaluru,Platinum\n"
    )
    orders_csv = (
        "order_id,customer_id,amount,order_date\n"
        "ORD1,C01,1500.50,2024-01-15\n"
        "ORD2,C02,2300.00,2024-02-10\n"
        "ORD3,C01,890.00,2024-03-01\n"
        "ORD4,C03,4500.00,2024-03-22\n"
    )

    files = [
        ("files", ("customers.csv", io.BytesIO(customers_csv.encode("utf-8")), "text/csv")),
        ("files", ("orders.csv", io.BytesIO(orders_csv.encode("utf-8")), "text/csv")),
    ]

    response = client.post("/api/upload/profile-multiple", files=files)
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert data["dataset_count"] == 2
    assert len(data["datasets"]) == 2

    # Verify first dataset (customers)
    ds_customers = data["datasets"][0]
    assert ds_customers["dataset_id"] == "ds_customers"
    assert ds_customers["filename"] == "customers.csv"
    assert ds_customers["file_type"] == ".csv"
    assert ds_customers["rows"] == 3
    assert ds_customers["columns"] == 4
    assert ds_customers["profile"]["quality"]["score"] == 100.0
    assert len(ds_customers["profile"]["preview"]) == 3

    # Verify second dataset (orders)
    ds_orders = data["datasets"][1]
    assert ds_orders["dataset_id"] == "ds_orders"
    assert ds_orders["filename"] == "orders.csv"
    assert ds_orders["file_type"] == ".csv"
    assert ds_orders["rows"] == 4
    assert ds_orders["columns"] == 4
    assert "amount" in ds_orders["profile"]["numeric_columns"]


def test_multi_upload_mixed_formats(client):
    """Test uploading a CSV, JSON, and XLSX file in a single request."""
    # CSV
    csv_bytes = "sku,name,stock\nS1,Widget,50\nS2,Gadget,20\n".encode("utf-8")

    # JSON
    json_bytes = json.dumps([
        {"dept_id": 1, "department": "Engineering", "budget": 500000},
        {"dept_id": 2, "department": "Marketing", "budget": 250000},
    ]).encode("utf-8")

    # XLSX
    excel_io = io.BytesIO()
    df_excel = pd.DataFrame({
        "emp_id": [101, 102],
        "name": ["Alice", "Bob"],
        "dept_id": [1, 2],
    })
    with pd.ExcelWriter(excel_io, engine="openpyxl") as writer:
        df_excel.to_excel(writer, index=False)
    excel_io.seek(0)

    files = [
        ("files", ("inventory.csv", io.BytesIO(csv_bytes), "text/csv")),
        ("files", ("departments.json", io.BytesIO(json_bytes), "application/json")),
        ("files", ("employees.xlsx", excel_io, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")),
    ]

    response = client.post("/api/upload/profile-multiple", files=files)
    assert response.status_code == 200

    data = response.json()
    assert data["dataset_count"] == 3
    assert [d["dataset_id"] for d in data["datasets"]] == ["ds_inventory", "ds_departments", "ds_employees"]
    assert data["datasets"][0]["file_type"] == ".csv"
    assert data["datasets"][1]["file_type"] == ".json"
    assert data["datasets"][2]["file_type"] == ".xlsx"


def test_multi_upload_id_collision_handling(client):
    """Test safe deduplication of dataset_id when filenames collide."""
    csv1 = "id,val\n1,10\n".encode("utf-8")
    csv2 = "id,val\n2,20\n".encode("utf-8")

    files = [
        ("files", ("data.csv", io.BytesIO(csv1), "text/csv")),
        ("files", ("data.csv", io.BytesIO(csv2), "text/csv")),
    ]

    response = client.post("/api/upload/profile-multiple", files=files)
    assert response.status_code == 200

    data = response.json()
    assert data["dataset_count"] == 2
    assert data["datasets"][0]["dataset_id"] == "ds_data"
    assert data["datasets"][1]["dataset_id"] == "ds_data_2"


def test_multi_upload_one_empty_file_fails(client):
    """Test that if any file in the batch is empty, an informative 400 error is returned."""
    valid_csv = "id,val\n1,10\n".encode("utf-8")
    empty_csv = b""

    files = [
        ("files", ("valid.csv", io.BytesIO(valid_csv), "text/csv")),
        ("files", ("empty.csv", io.BytesIO(empty_csv), "text/csv")),
    ]

    response = client.post("/api/upload/profile-multiple", files=files)
    assert response.status_code == 400
    assert "empty.csv" in response.json()["detail"]


def test_multi_upload_unsupported_extension_fails(client):
    """Test that if any file has an unsupported format, a clear 400 error identifies it."""
    valid_csv = "id,val\n1,10\n".encode("utf-8")
    invalid_file = b"Some random plain text"

    files = [
        ("files", ("valid.csv", io.BytesIO(valid_csv), "text/csv")),
        ("files", ("unsupported.txt", io.BytesIO(invalid_file), "text/plain")),
    ]

    response = client.post("/api/upload/profile-multiple", files=files)
    assert response.status_code == 400
    assert "unsupported.txt" in response.json()["detail"]


def test_multi_upload_individual_analytics_and_filtering(client):
    """Test that multiple uploaded files each receive complete individual analytics and can be filtered independently."""
    students_csv = (
        "student_id,name,grade,score\n"
        "S1,Aarav,10,88.5\n"
        "S2,Diya,10,94.0\n"
        "S3,Rohan,11,76.5\n"
        "S4,Ananya,11,91.0\n"
    )
    employees_csv = (
        "emp_id,employee_name,department,salary\n"
        "E101,Rajesh,Engineering,85000\n"
        "E102,Priya,Product,92000\n"
        "E103,Amit,Marketing,65000\n"
    )

    files = [
        ("files", ("students.csv", io.BytesIO(students_csv.encode("utf-8")), "text/csv")),
        ("files", ("employees.csv", io.BytesIO(employees_csv.encode("utf-8")), "text/csv")),
    ]

    response = client.post("/api/upload/profile-multiple", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["dataset_count"] == 2

    # Check individual analysis in response
    ds_students = data["datasets"][0]
    assert ds_students["dataset_id"] == "ds_students"
    assert "analysis" in ds_students and ds_students["analysis"] is not None
    assert len(ds_students["analysis"]["modules"]) > 0
    assert "score" in [col["name"] for col in ds_students["analysis"]["detected_columns"]]

    ds_employees = data["datasets"][1]
    assert ds_employees["dataset_id"] == "ds_employees"
    assert "analysis" in ds_employees and ds_employees["analysis"] is not None
    assert len(ds_employees["analysis"]["modules"]) > 0
    assert "salary" in [col["name"] for col in ds_employees["analysis"]["detected_columns"]]

    # Test GET /api/upload/dataset/{dataset_id}/analysis endpoint
    res_get = client.get("/api/upload/dataset/ds_students/analysis")
    assert res_get.status_code == 200
    res_get_data = res_get.json()
    assert res_get_data["success"] is True
    assert res_get_data["dataset"]["rows"] == 4

    # Test independent filtering on students dataset
    filter_res = client.post(
        "/api/upload/filter",
        json={
            "dataset_id": "ds_students",
            "filters": {"grade": ["10"]},
        },
    )
    assert filter_res.status_code == 200
    f_data = filter_res.json()
    assert f_data["total_rows"] == 4
    assert f_data["filtered_rows"] == 2
    assert f_data["is_filtered"] is True

    # Test relationship detection on students vs employees returns 0 relationships (independent)
    rel_res = client.post(
        "/api/upload/relationships",
        json={"dataset_ids": ["ds_students", "ds_employees"]},
    )
    assert rel_res.status_code == 200
    rel_data = rel_res.json()
    assert rel_data["relationship_count"] == 0

