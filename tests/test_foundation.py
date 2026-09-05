import sys
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app
from app.core.config import APP_NAME, ENVIRONMENT, DB_PATH, JWT_SECRET, ALL_ROLES
from app.core.database import check_db_connection, init_db
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from database.seed_data import seed_all

client = TestClient(app)

def setup_module():
    """Ensure database is seeded and ready for testing."""
    seed_all()

# 1. TEST BACKEND STARTUP & HEALTH
def test_backend_starts_and_health_returns_ok():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "HEALTHY"
    assert data["app_name"] == APP_NAME
    assert data["environment"] == ENVIRONMENT
    assert data["version"] == "1.0.0"

# 2. TEST DATABASE CONNECTION & TABLE VERIFICATION
def test_database_connection():
    db_check = check_db_connection()
    assert db_check["connected"] is True
    assert db_check["engine"] == "SQLite"
    assert db_check["tables_initialized"] >= 10
    assert Path(db_check["database_path"]).exists()

# 3. TEST ENVIRONMENT CONFIGURATION
def test_environment_configuration():
    assert APP_NAME == "Enterprise AI Civic Platform"
    assert ENVIRONMENT == "development"
    assert len(ALL_ROLES) == 5
    assert "citizen" in ALL_ROLES
    assert "ert_responder" in ALL_ROLES
    assert JWT_SECRET is not None

# 4. TEST SYSTEM INFO & ROLES
def test_system_info_endpoint():
    res = client.get("/api/v1/system-info")
    assert res.status_code == 200
    data = res.json()
    assert data["api_version"] == "v1"
    assert set(data["supported_roles"]) == set(ALL_ROLES)

# 5. TEST AUTHENTICATION FOUNDATION: HASHING & JWT
def test_auth_hashing_and_jwt_tokens():
    plain = "TestPassword@2026"
    hashed = hash_password(plain)
    assert hashed != plain
    assert verify_password(plain, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

    # Token creation & decoding
    claims = {"sub": "user-test-123", "role": "citizen", "name": "Test User"}
    token = create_access_token(claims)
    assert isinstance(token, str)
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "user-test-123"
    assert decoded["role"] == "citizen"

# 6. TEST AUTH ENDPOINTS: LOGIN & ROLE SWITCHING
def test_auth_endpoints_login_and_role_switching():
    # Login with credentials
    login_res = client.post("/api/v1/auth/login", json={
        "phone_or_email": "citizen@civic.gov",
        "password": "citizen123"
    })
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    assert token_data["user"]["email"] == "citizen@civic.gov"

    # 1-Click Role Switch for Demo evaluation
    for role in ALL_ROLES:
        switch_res = client.post("/api/v1/auth/switch-role", json={"target_role": role})
        assert switch_res.status_code == 200
        sw_data = switch_res.json()
        assert sw_data["user"]["role"] == role

# 7. TEST ERROR HANDLING: 404 AND 422 VALIDATION
def test_error_handling_and_validation():
    # 404 Not Found error handling
    not_found_res = client.get("/api/v1/non-existent-route")
    assert not_found_res.status_code == 404
    err_json = not_found_res.json()
    assert err_json["success"] is False
    assert err_json["error"]["code"] == 404

    # 422 Validation error handling on malformed payload
    # Missing required 'title' and 'description'
    invalid_res = client.post("/api/v1/complaints", json={
        "latitude": "not-a-number"
    })
    assert invalid_res.status_code == 422
    val_json = invalid_res.json()
    assert val_json["success"] is False
    assert val_json["error"]["type"] == "VALIDATION_ERROR"
    assert len(val_json["error"]["details"]) > 0

# 8. TEST FRONTEND SERVING FOUNDATION
def test_frontend_loads_and_serves_html():
    res = client.get("/")
    assert res.status_code == 200
    assert "<!DOCTYPE html>" in res.text
    assert "Enterprise AI Civic" in res.text
    assert "root" in res.text
