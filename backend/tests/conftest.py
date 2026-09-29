import sys
from pathlib import Path
import pytest
from starlette.testclient import TestClient

# Ensure backend and workspace directories are on sys.path
TEST_DIR = Path(__file__).resolve().parent
BACKEND_DIR = TEST_DIR.parent
WORKSPACE_DIR = BACKEND_DIR.parent

for p in [str(WORKSPACE_DIR), str(BACKEND_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app.main import app
from backend.app.analytics.data_service import data_service

@pytest.fixture(scope="session", autouse=True)
def initialize_data():
    """Ensure analytical data is loaded once before running tests."""
    data_service.initialize()
    assert len(data_service.fact_orders) > 0, "fact_orders table failed to load."

@pytest.fixture(scope="module")
def client():
    """FastAPI TestClient fixture."""
    with TestClient(app) as test_client:
        yield test_client
