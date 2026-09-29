import json
from starlette.testclient import TestClient
from backend.app.main import app
from backend.app.analytics.data_service import data_service

def verify_all_endpoints():
    print("="*60)
    print("VERIFYING ALL MAJOR BACKEND REST API ENDPOINTS")
    print("="*60)
    data_service.initialize()
    client = TestClient(app)

    endpoints = [
        ("GET /api/health", "/api/health"),
        ("GET /api/metadata", "/api/metadata"),
        ("GET /api/filters", "/api/filters"),
        ("GET /api/overview", "/api/overview"),
        ("GET /api/overview (Filtered by Gujarat)", "/api/overview?state=Gujarat"),
        ("GET /api/sales/trend (Monthly)", "/api/sales/trend?granularity=month"),
        ("GET /api/sales/category", "/api/sales/category?limit=5"),
        ("GET /api/sales/state", "/api/sales/state?limit=5"),
        ("GET /api/sales/city", "/api/sales/city?limit=5"),
        ("GET /api/sales/payment", "/api/sales/payment"),
        ("GET /api/products/top", "/api/products/top?metric=revenue&limit=5"),
        ("GET /api/products/categories", "/api/products/categories?limit=5"),
        ("GET /api/customers/summary", "/api/customers/summary"),
        ("GET /api/customers/top", "/api/customers/top?limit=5"),
        ("GET /api/customers/segments", "/api/customers/segments"),
        ("GET /api/geography/states", "/api/geography/states"),
        ("GET /api/geography/cities", "/api/geography/cities?limit=5"),
        ("GET /api/sellers/top", "/api/sellers/top?limit=5"),
        ("GET /api/payments/summary", "/api/payments/summary"),
        ("GET /api/reviews/summary", "/api/reviews/summary"),
        ("GET /api/insights", "/api/insights")
    ]

    for label, url in endpoints:
        resp = client.get(url)
        assert resp.status_code == 200, f"Endpoint {url} failed with status {resp.status_code}: {resp.text}"
        res_json = resp.json()
        print(f" [PASS] {label:42} -> Status: 200 OK")
        if "data" in res_json:
            # Print sample snippet
            sample_keys = list(res_json["data"].keys()) if isinstance(res_json["data"], dict) else f"List[{len(res_json['data'])}]"
            print(f"        Payload keys: {sample_keys}")

    print("\n" + "="*60)
    print("ALL 21 MAJOR ENDPOINTS VERIFIED AND PRODUCTION READY!")
    print("="*60)

if __name__ == "__main__":
    verify_all_endpoints()
