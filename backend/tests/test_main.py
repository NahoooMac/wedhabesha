"""
Main Application Tests

Test the main FastAPI application endpoints and configuration.
"""

import pytest
from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient):
    """Test root endpoint returns correct response"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Wedding Platform API"
    assert data["version"] == "1.0.0"
    assert "docs" in data
    assert data["status"] == "healthy"


def test_health_check_endpoint(client: TestClient):
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "wedding-platform-api"


def test_api_docs_accessible(client: TestClient):
    """Test that API documentation is accessible"""
    response = client.get("/docs")
    assert response.status_code == 200


def test_openapi_json_accessible(client: TestClient):
    """Test that OpenAPI JSON is accessible"""
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/json"