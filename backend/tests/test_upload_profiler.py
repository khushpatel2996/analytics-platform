import io
import json
import pytest
import pandas as pd
import numpy as np


def test_upload_csv_success(client):
    """Test uploading a valid CSV dataset with numeric, date, categorical, boolean and text columns."""
    csv_content = (
        "id,employee_name,department,hire_date,salary,is_active,notes\n"
        "1,Aarav Sharma,Engineering,2023-01-15,85000,true,Senior developer\n"
        "2,Diya Patel,Marketing,2023-03-20,62000,true,Marketing lead\n"
        "3,Rohan Verma,Sales,2022-11-05,54000,false,Field rep\n"
        "4,Pooja Nair,Engineering,2024-02-01,91000,true,Team lead\n"
        "5,Vikram Singh,HR,2021-08-12,48000,true,Recruiter\n"
    )
    files = {"file": ("employees.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post("/api/upload/profile", files=files)
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert data["file"]["name"] == "employees.csv"
    assert data["file"]["extension"] == ".csv"
    assert data["dataset"]["rows"] == 5
    assert data["dataset"]["columns"] == 7
    assert data["dataset"]["duplicate_rows"] == 0

    # Column grouping verification
    assert "salary" in data["numeric_columns"]
    assert "department" in data["categorical_columns"]
    assert "hire_date" in data["datetime_columns"]
    assert "is_active" in data["boolean_columns"]
    assert "notes" in data["text_columns"]

    # Preview verification
    assert len(data["preview"]) == 5
    assert data["preview"][0]["employee_name"] == "Aarav Sharma"

    # Quality score verification
    assert data["quality"]["score"] == 100.0
    assert data["quality"]["label"] == "Excellent"


def test_upload_xlsx_success(client):
    """Test uploading a valid XLSX Excel file."""
    df = pd.DataFrame({
        "product_id": [101, 102, 103, 104],
        "product_name": ["Laptop", "Mouse", "Keyboard", "Monitor"],
        "category": ["Electronics", "Accessories", "Accessories", "Electronics"],
        "price": [55000.0, 850.0, 2200.0, 18500.0],
        "stock": [15, 200, 75, 30]
    })
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False)
    output.seek(0)

    files = {"file": ("inventory.xlsx", output, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    response = client.post("/api/upload/profile", files=files)
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert data["file"]["extension"] == ".xlsx"
    assert data["dataset"]["rows"] == 4
    assert data["dataset"]["columns"] == 5
    assert "price" in data["numeric_columns"]
    assert "category" in data["categorical_columns"]

    # Verify numeric statistics
    price_col = next(c for c in data["columns"] if c["name"] == "price")
    assert price_col["statistics"]["min"] == 850.0
    assert price_col["statistics"]["max"] == 55000.0


def test_upload_json_records_success(client):
    """Test uploading a valid JSON dataset formatted as an array of objects."""
    records = [
        {"city": "Mumbai", "temperature": 32.5, "humidity": 78, "recorded_at": "2025-05-01"},
        {"city": "Delhi", "temperature": 40.2, "humidity": 45, "recorded_at": "2025-05-01"},
        {"city": "Bengaluru", "temperature": 28.0, "humidity": 65, "recorded_at": "2025-05-01"},
        {"city": "Kolkata", "temperature": 34.1, "humidity": 82, "recorded_at": "2025-05-01"},
    ]
    json_bytes = json.dumps(records).encode("utf-8")
    files = {"file": ("weather.json", io.BytesIO(json_bytes), "application/json")}
    response = client.post("/api/upload/profile", files=files)
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert data["file"]["extension"] == ".json"
    assert data["dataset"]["rows"] == 4
    assert data["dataset"]["columns"] == 4
    assert "city" in data["categorical_columns"]
    assert "temperature" in data["numeric_columns"]
    assert "recorded_at" in data["datetime_columns"]


def test_upload_missing_values_and_duplicates(client):
    """Test dataset profiling with missing values, duplicate rows, and empty columns."""
    csv_content = (
        "patient_id,age,blood_group,admission_date,empty_notes\n"
        "P1,45,O+,2024-01-10,\n"
        "P2,,A+,2024-01-12,\n"
        "P1,45,O+,2024-01-10,\n"  # Duplicate row
        "P3,62,,2024-01-15,\n"
    )
    files = {"file": ("hospital.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    response = client.post("/api/upload/profile", files=files)
    assert response.status_code == 200

    data = response.json()
    assert data["dataset"]["rows"] == 4
    assert data["dataset"]["duplicate_rows"] == 1
    assert data["dataset"]["duplicate_percentage"] == 25.0
    assert "empty_notes" in data["empty_columns"]
    assert data["summary"]["empty_column_count"] == 1
    assert data["summary"]["total_missing_values"] > 0

    # Quality score should reflect deductions
    assert data["quality"]["score"] < 100.0


def test_upload_empty_dataset_fails(client):
    """Test uploading an empty dataset (0 rows) returns HTTP 400."""
    empty_csv = "col1,col2,col3\n"
    files = {"file": ("empty.csv", io.BytesIO(empty_csv.encode("utf-8")), "text/csv")}
    response = client.post("/api/upload/profile", files=files)
    assert response.status_code == 400
    res = response.json()
    assert "empty" in res.get("detail", "").lower() or "empty" in res.get("error", {}).get("message", "").lower()


def test_upload_unsupported_extension_fails(client):
    """Test uploading an unsupported file type (e.g. .txt or .py) returns HTTP 400."""
    script_content = "print('Hello world')"
    files = {"file": ("script.py", io.BytesIO(script_content.encode("utf-8")), "text/plain")}
    response = client.post("/api/upload/profile", files=files)
    assert response.status_code == 400
    res = response.json()
    assert "unsupported" in res.get("detail", "").lower() or "unsupported" in res.get("error", {}).get("message", "").lower()


def test_upload_corrupted_file_fails(client):
    """Test uploading a corrupted or unparseable file returns HTTP 400."""
    corrupted_excel = b"This is not a valid zip or excel spreadsheet content at all."
    files = {"file": ("corrupt.xlsx", io.BytesIO(corrupted_excel), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    response = client.post("/api/upload/profile", files=files)
    assert response.status_code == 400
    res = response.json()
    assert "unable to read" in res.get("detail", "").lower() or "unable to read" in res.get("error", {}).get("message", "").lower()


def test_upload_file_too_large_fails(client, monkeypatch):
    """Test uploading a file larger than MAX_UPLOAD_SIZE_MB returns HTTP 413."""
    from backend.app.core.config import settings
    # Temporarily set max upload size to 0 MB (so any non-empty file exceeds it)
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_MB", 0)
    files = {"file": ("sample.csv", io.BytesIO(b"a,b\n1,2\n"), "text/csv")}
    response = client.post("/api/upload/profile", files=files)
    assert response.status_code == 413
    res = response.json()
    assert "too large" in res.get("detail", "").lower() or "too large" in res.get("error", {}).get("message", "").lower()


def test_upload_json_object_with_records_key(client):
    """Test uploading JSON with standard {'data': [...]} wrapper."""
    payload = {
        "status": "success",
        "data": [
            {"student_id": "S01", "name": "Rahul", "score": 92.5, "passed": True},
            {"student_id": "S02", "name": "Priya", "score": 88.0, "passed": True},
            {"student_id": "S03", "name": "Amit", "score": 45.0, "passed": False}
        ]
    }
    json_bytes = json.dumps(payload).encode("utf-8")
    files = {"file": ("students.json", io.BytesIO(json_bytes), "application/json")}
    response = client.post("/api/upload/profile", files=files)
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    assert res["dataset"]["rows"] == 3
    assert "score" in res["numeric_columns"]
    assert "passed" in res["boolean_columns"]
