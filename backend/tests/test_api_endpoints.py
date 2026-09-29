import pytest

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["data_loaded"] is True
    assert data["total_orders_available"] > 0

def test_metadata(client):
    response = client.get("/api/metadata")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    meta = res["data"]
    assert "India" in meta["geographic_coverage"]
    assert meta["currency"] == "INR (₹)"
    assert meta["total_orders_in_db"] > 90000
    assert meta["total_states_in_db"] > 10

def test_filters_endpoint(client):
    response = client.get("/api/filters")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    f = res["data"]
    assert len(f["states"]) > 0
    assert "Gujarat" in f["states"] or "Andhra Pradesh" in f["states"]
    assert len(f["years"]) > 0
    assert len(f["categories"]) > 0
    assert "Champions" in f["customer_segments"]

def test_overview_unfiltered(client):
    response = client.get("/api/overview")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    kpis = res["data"]["kpis"]
    assert kpis["total_revenue"] > 1000000
    assert kpis["total_orders"] > 90000
    assert kpis["average_order_value"] > 0
    assert kpis["average_review_score"] > 0
    assert 0 <= kpis["cancellation_rate"] <= 100
    assert 0 <= kpis["delivery_rate"] <= 100

def test_overview_with_state_filter(client):
    response = client.get("/api/overview?state=Gujarat")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    kpis = res["data"]["kpis"]
    assert kpis["total_orders"] > 0
    assert res["filters"]["state"] == "Gujarat"

def test_sales_trend(client):
    response = client.get("/api/sales/trend?granularity=month")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    assert data["granularity"] == "month"
    assert len(data["trend"]) > 0
    assert len(data["chart_data"]["labels"]) == len(data["chart_data"]["values"])

def test_sales_category_and_state(client):
    res_cat = client.get("/api/sales/category?limit=10")
    assert res_cat.status_code == 200
    assert res_cat.json()["success"] is True
    assert len(res_cat.json()["data"]["items"]) <= 10

    res_st = client.get("/api/sales/state?limit=10")
    assert res_st.status_code == 200
    assert res_st.json()["success"] is True
    assert len(res_st.json()["data"]["items"]) <= 10

def test_geography_states(client):
    response = client.get("/api/geography/states")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    data = res["data"]
    assert len(data["states"]) > 0
    assert len(data["regions"]) > 0
    # Check that returned state names are Indian states
    state_names = [s["state"] for s in data["states"]]
    assert any("Pradesh" in s or "Gujarat" in s or "Delhi" in s for s in state_names)

def test_products_top_and_categories(client):
    res_top = client.get("/api/products/top?metric=revenue&limit=5")
    assert res_top.status_code == 200
    assert res_top.json()["success"] is True
    assert len(res_top.json()["data"]["items"]) == 5

    res_qty = client.get("/api/products/top?metric=quantity&limit=5")
    assert res_qty.status_code == 200
    assert res_qty.json()["success"] is True

    res_cat = client.get("/api/products/categories?limit=5")
    assert res_cat.status_code == 200
    assert res_cat.json()["success"] is True

def test_customer_analytics(client):
    # Summary
    res_sum = client.get("/api/customers/summary")
    assert res_sum.status_code == 200
    assert res_sum.json()["success"] is True
    assert res_sum.json()["data"]["total_customers"] > 0

    # Top Customers with masked IDs for privacy
    res_top = client.get("/api/customers/top?limit=5")
    assert res_top.status_code == 200
    assert res_top.json()["success"] is True
    top_custs = res_top.json()["data"]
    assert len(top_custs) == 5
    assert "..." in top_custs[0]["customer_unique_id"], "Customer ID must be anonymized"

    # Segments
    res_seg = client.get("/api/customers/segments")
    assert res_seg.status_code == 200
    assert res_seg.json()["success"] is True
    seg_data = res_seg.json()["data"]
    assert len(seg_data["clusters"]) == 4
    assert seg_data["total_customers_segmented"] > 0

def test_payments_and_reviews(client):
    res_pay = client.get("/api/payments/summary")
    assert res_pay.status_code == 200
    assert res_pay.json()["success"] is True
    assert len(res_pay.json()["data"]["distribution"]) > 0

    res_rev = client.get("/api/reviews/summary")
    assert res_rev.status_code == 200
    assert res_rev.json()["success"] is True
    assert len(res_rev.json()["data"]["rating_distribution"]) == 5

def test_insights_engine(client):
    response = client.get("/api/insights")
    assert response.status_code == 200
    res = response.json()
    assert res["success"] is True
    insights = res["data"]["insights"]
    assert len(insights) > 0
    # Every insight must have type, title, description, metric, value
    for ins in insights:
        assert "type" in ins
        assert "title" in ins
        assert "description" in ins
        assert "metric" in ins
        assert "value" in ins

def test_invalid_filter_handling(client):
    # date_from after date_to
    response = client.get("/api/overview?date_from=2018-12-31&date_to=2018-01-01")
    assert response.status_code == 400
    res = response.json()
    assert res["success"] is False
    assert res["error"]["code"] == "INVALID_FILTER"

    # malformed date
    response2 = client.get("/api/overview?date_from=not-a-date")
    assert response2.status_code == 400
    assert response2.json()["success"] is False
