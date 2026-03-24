import os
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_endpoint():
    """Verify that the lightweight health endpoint is reachable (no auth required)."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_router_mounting():
    """Verify that routers are correctly mounted."""
    # Check a few routes from different routers
    routes = [
        "/api/health",        # system
        "/api/token",         # auth
        "/api/admin/locations",# admin
        "/api/voters",        # voters
        "/api/stats",         # analytics
    ]
    
    # We don't need to be authenticated for the 401 check, 
    # just want to see if they return 401 (mounted) vs 404 (not mounted)
    for route in routes:
        response = client.get(route)
        assert response.status_code != 404, f"Route {route} not found!"

def test_ocr_processor_init():
    """Verify that the core PDF processor can be initialized."""
    from core.pdf_processor import PDFProcessor
    processor = PDFProcessor()
    assert processor is not None
    if os.name == 'nt':
        assert "poppler" in processor.poppler_path.lower()
