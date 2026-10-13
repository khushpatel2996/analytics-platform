import io
import json
import pytest
import pandas as pd
import numpy as np
from datetime import datetime

from backend.app.analytics.dataset_profiler import DatasetProfiler, FileMetadata
from backend.app.analytics.dataset_intelligence import DatasetIntelligenceEngine


def test_detect_semantic_type_individual_column_types():
    """
    Regression Test 1: Unit tests for DatasetProfiler.detect_semantic_type().
    Verifies safe handling of:
    - normal string column
    - numeric column
    - dictionary/object column
    - list/object column
    - mixed object column
    - missing values (None / NaN)
    - boolean column
    - date column
    """
    # 1. Normal string column
    s_str = pd.Series(["apple", "banana", "cherry", "apple"])
    assert DatasetProfiler.detect_semantic_type(s_str, col_name="fruit") in ["categorical", "text"]

    # 2. Numeric column
    s_num = pd.Series([10.5, 20.0, 35.2, 40.8])
    assert DatasetProfiler.detect_semantic_type(s_num, col_name="price") == "numeric"

    # 3. Dictionary / object column (e.g. nested JSON or dict objects)
    s_dict = pd.Series([
        {"role": "admin", "access": 1},
        {"role": "user", "access": 2},
        {"role": "guest", "access": 3},
        {"role": "user", "access": 2},
    ])
    type_dict = DatasetProfiler.detect_semantic_type(s_dict, col_name="metadata")
    assert type_dict in ["text", "categorical"]

    # 4. List / object column (e.g. tag lists)
    s_list = pd.Series([
        ["python", "fastapi"],
        ["react", "typescript"],
        ["docker", "k8s"],
        ["python", "fastapi"],
    ])
    type_list = DatasetProfiler.detect_semantic_type(s_list, col_name="tags")
    assert type_list in ["text", "categorical"]

    # 5. Mixed object column (contains numbers, strings, dicts, lists, None)
    s_mixed = pd.Series(["hello", 42, {"meta": True}, [1, 2], None])
    type_mixed = DatasetProfiler.detect_semantic_type(s_mixed, col_name="mixed_payload")
    assert type_mixed in ["text", "categorical"]

    # 6. Missing values only (None / NaN)
    s_missing = pd.Series([None, np.nan, None])
    assert DatasetProfiler.detect_semantic_type(s_missing, col_name="empty_col") == "text"

    # 7. Boolean column (native and object boolean strings)
    s_bool = pd.Series([True, False, True, False])
    assert DatasetProfiler.detect_semantic_type(s_bool, col_name="is_active") == "boolean"

    s_bool_str = pd.Series(["true", "false", "true", "false"])
    assert DatasetProfiler.detect_semantic_type(s_bool_str, col_name="flag") == "boolean"

    # 8. Date column
    s_date = pd.Series(["2023-01-15", "2023-02-20", "2023-03-10", "2023-04-05"])
    assert DatasetProfiler.detect_semantic_type(s_date, col_name="order_date") == "datetime"


def test_unhashable_values_preserves_original_dataframe():
    """
    Regression Test 2: Confirms safe representations do not mutate original DataFrame values.
    """
    dict_val_1 = {"config": "val1"}
    dict_val_2 = {"config": "val2"}
    list_val_1 = [1, 2, 3]

    df = pd.DataFrame({
        "id": [1, 2],
        "dict_col": [dict_val_1, dict_val_2],
        "list_col": [list_val_1, ["a", "b"]],
    })

    meta = FileMetadata(name="test_mutate.json", extension=".json", size_bytes=120, size_mb=0.001)

    # Run profiling
    profile = DatasetProfiler.profile(df, meta)
    assert profile.success is True

    # Assert original DataFrame values and types are exactly preserved
    assert df["dict_col"].iloc[0] is dict_val_1
    assert isinstance(df["dict_col"].iloc[0], dict)
    assert df["list_col"].iloc[0] is list_val_1
    assert isinstance(df["list_col"].iloc[0], list)


def test_endpoint_analyze_nested_dict_json_returns_200(client):
    """
    Regression Test 3 (The failing bug scenario):
    POST /api/upload/analyze with dataset containing dictionary and nested JSON objects
    must return HTTP 200 instead of HTTP 500 TypeError: unhashable type: 'dict'.
    """
    json_data = [
        {
            "id": 101,
            "username": "user_alpha",
            "score": 88.5,
            "is_active": True,
            "created_at": "2023-05-01",
            "attributes": {"tier": "gold", "points": 1200},
            "tags": ["core", "beta"],
            "extra": None,
        },
        {
            "id": 102,
            "username": "user_beta",
            "score": 92.0,
            "is_active": False,
            "created_at": "2023-05-15",
            "attributes": {"tier": "silver", "points": 450},
            "tags": ["standard"],
            "extra": {"note": "special account"},
        },
        {
            "id": 103,
            "username": "user_gamma",
            "score": 76.0,
            "is_active": True,
            "created_at": "2023-06-01",
            "attributes": {"tier": "gold", "points": 980},
            "tags": ["core"],
            "extra": None,
        },
    ]

    file_bytes = json.dumps(json_data).encode("utf-8")
    response = client.post(
        "/api/upload/analyze",
        files={"file": ("users_with_nested_objects.json", io.BytesIO(file_bytes), "application/json")},
    )

    assert response.status_code == 200, f"Expected 200 but got {response.status_code}: {response.text}"
    data = response.json()
    assert data["success"] is True
    assert data["dataset"]["rows"] == 3
    assert len(data["modules"]) > 0
    assert "quality" in data["profile"]
    assert data["profile"]["quality"]["score"] > 0
    assert len(data["profile"]["preview"]) == 3


def test_endpoint_analyze_csv_with_raw_python_dicts_and_lists(client):
    """
    Regression Test 4:
    Direct CSV with stringified dicts and list-like strings or mixed structures.
    """
    csv_content = (
        "id,user,meta_details,score,registration_date\n"
        "1,Alice,\"{'tier': 'gold', 'level': 3}\",95.5,2023-01-10\n"
        "2,Bob,\"{'tier': 'silver', 'level': 1}\",82.0,2023-02-14\n"
        "3,Charlie,\"{'tier': 'bronze', 'level': 0}\",78.0,2023-03-22\n"
        "4,Diana,\"{'tier': 'gold', 'level': 2}\",91.5,2023-04-05\n"
    )
    response = client.post(
        "/api/upload/analyze",
        files={"file": ("users_metadata.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["dataset"]["rows"] == 4
    assert len(data["modules"]) > 0


def test_endpoint_analyze_existing_student_employee_sales(client):
    """
    Regression Test 5:
    Ensures existing standard student, employee, and sales datasets continue to work seamlessly.
    """
    # 1. Students dataset
    students_csv = (
        "student_id,name,grade,score,status\n"
        "S1,Aarav,10,88.5,Passed\n"
        "S2,Diya,10,94.0,Passed\n"
        "S3,Rohan,11,76.5,Passed\n"
        "S4,Ananya,11,49.0,Failed\n"
    )
    res_students = client.post(
        "/api/upload/analyze",
        files={"file": ("students.csv", io.BytesIO(students_csv.encode("utf-8")), "text/csv")},
    )
    assert res_students.status_code == 200
    data_students = res_students.json()
    assert data_students["success"] is True
    assert data_students["dataset"]["rows"] == 4

    # 2. Employees dataset
    employees_csv = (
        "emp_id,employee_name,department,salary,hire_date\n"
        "E101,Rajesh,Engineering,85000,2022-01-15\n"
        "E102,Priya,Product,92000,2021-06-20\n"
        "E103,Amit,Marketing,65000,2023-03-10\n"
    )
    res_employees = client.post(
        "/api/upload/analyze",
        files={"file": ("employees.csv", io.BytesIO(employees_csv.encode("utf-8")), "text/csv")},
    )
    assert res_employees.status_code == 200
    data_employees = res_employees.json()
    assert data_employees["success"] is True
    assert data_employees["dataset"]["rows"] == 3

    # 3. Sales dataset
    sales_csv = (
        "order_id,order_date,customer,product,amount,qty\n"
        "O1,2023-01-01,Alice,Laptop,1200.0,1\n"
        "O2,2023-01-02,Bob,Mouse,25.0,2\n"
        "O3,2023-01-03,Charlie,Monitor,300.0,1\n"
    )
    res_sales = client.post(
        "/api/upload/analyze",
        files={"file": ("sales.csv", io.BytesIO(sales_csv.encode("utf-8")), "text/csv")},
    )
    assert res_sales.status_code == 200
    data_sales = res_sales.json()
    assert data_sales["success"] is True
    assert data_sales["dataset"]["rows"] == 3
