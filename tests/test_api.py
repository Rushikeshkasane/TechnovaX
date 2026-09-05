import sys
from pathlib import Path

# Add backend and workspace root to sys.path
workspace_dir = Path(__file__).resolve().parent.parent
backend_dir = workspace_dir / "backend"
sys.path.insert(0, str(workspace_dir))
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app.main import app
from database.seed_data import seed_all

client = TestClient(app)

def setup_module():
    """Ensure clean seed state before running tests."""
    seed_all()

def test_health():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "HEALTHY"

def test_auth_role_switching():
    roles = ["citizen", "officer", "department_admin", "ert_responder", "admin"]
    for role in roles:
        res = client.post("/api/v1/auth/switch-role", json={"target_role": role})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["user"]["role"] == role

def test_citizen_registration_and_login():
    import uuid
    import random
    rnd_email = f"test_citizen_{uuid.uuid4().hex[:6]}@example.com"
    rnd_phone = f"+91 91{random.randint(10000000, 99999999)}"

    
    # 1. Successful registration
    reg_res = client.post("/api/v1/auth/register", json={
        "full_name": "Priya Sharma",
        "email": rnd_email,
        "phone": rnd_phone,
        "password": "Password123!",
        "confirm_password": "Password123!",
        "address": "42 MG Road, Fort",
        "city": "Mumbai",
        "terms_accepted": True
    })
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert reg_data["user"]["role"] == "citizen"
    assert reg_data["user"]["full_name"] == "Priya Sharma"
    assert "access_token" in reg_data

    # 2. Duplicate email rejection
    dup_res = client.post("/api/v1/auth/register", json={
        "full_name": "Priya Duplicate",
        "email": rnd_email,
        "phone": "+91 99999 88888",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "address": "42 MG Road, Fort",
        "city": "Mumbai",
        "terms_accepted": True
    })
    assert dup_res.status_code == 400
    assert "email" in dup_res.json()["detail"].lower()

    # 3. Password confirmation mismatch
    mismatch_res = client.post("/api/v1/auth/register", json={
        "full_name": "Mismatch User",
        "email": f"mismatch_{uuid.uuid4().hex[:4]}@example.com",
        "phone": "+91 90000 11111",
        "password": "Password123!",
        "confirm_password": "DifferentPassword",
        "address": "Some street",
        "city": "Mumbai",
        "terms_accepted": True
    })
    assert mismatch_res.status_code == 400

    # 4. Login with newly registered user
    login_res = client.post("/api/v1/auth/login", json={
        "phone_or_email": rnd_email,
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["user"]["email"] == rnd_email
    token = login_data["access_token"]

    # 5. Access verified profile
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["full_name"] == "Priya Sharma"

def test_rbac_access_control():
    # Citizen attempts to access Admin audit logs -> 403 Forbidden
    cit_auth = client.post("/api/v1/auth/switch-role", json={"target_role": "citizen"}).json()
    cit_token = cit_auth["access_token"]

    audit_res = client.get("/api/v1/admin/audit-logs", headers={"Authorization": f"Bearer {cit_token}"})
    assert audit_res.status_code == 403

    # System Admin accesses Admin audit logs -> 200 OK
    admin_auth = client.post("/api/v1/auth/switch-role", json={"target_role": "admin"}).json()
    admin_token = admin_auth["access_token"]

    admin_audit_res = client.get("/api/v1/admin/audit-logs", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_audit_res.status_code == 200

    # Public tracking endpoint works without authentication
    pub_track = client.get("/api/v1/complaints/public/track/GRV-2026-0001")
    assert pub_track.status_code == 200
    assert "ticket_number" in pub_track.json()


def test_ai_triage_nlp():
    # Test pothole classification
    res = client.post("/api/v1/ai/triage", json={
        "text": "Huge hazardous pothole in the middle of the road near hospital, cars swerving into oncoming traffic",
        "latitude": 19.0760,
        "longitude": 72.8777
    })
    assert res.status_code == 200
    data = res.json()
    assert data["category"] == "pothole"
    assert data["suggested_department_id"] == "dept-roads"
    assert data["priority"] in ["P1_CRITICAL", "P2_HIGH"]
    assert data["sla_hours"] <= 24

def test_ai_citizen_assistant():
    res = client.post("/api/v1/ai/assistant/chat", json={
        "message": "How long does it take to repair a broken water pipe?"
    })
    assert res.status_code == 200
    data = res.json()
    assert "water" in data["reply"].lower()

def test_complaint_lifecycle():
    # 1. File complaint
    create_res = client.post("/api/v1/complaints", json={
        "title": "Severe Sewage Overflow into Market",
        "description": "Drain pipe blocked with foul smelling sewage flooding grocery stalls",
        "latitude": 19.0850,
        "longitude": 72.8800,
        "address_text": "Market Road, Kurla West"
    })
    assert create_res.status_code == 200
    comp = create_res.json()
    c_id = comp["id"]
    assert comp["status"] == "SUBMITTED"
    assert comp["department_id"] == "dept-water"

    # 2. Officer takes complaint in progress
    status_res = client.patch(f"/api/v1/complaints/{c_id}/status", json={
        "status": "IN_PROGRESS",
        "comment": "Field inspection team en-route"
    })
    assert status_res.status_code == 200
    assert status_res.json()["new_status"] == "IN_PROGRESS"

    # 3. Officer resolves with proof of work
    resolve_res = client.post(f"/api/v1/complaints/{c_id}/resolve", json={
        "proof_photo_url": "/uploads/proof_sample.jpg",
        "resolution_notes": "Sewer line unclogged and high-pressure flushed with disinfectant",
        "officer_latitude": 19.0851,
        "officer_longitude": 72.8801
    })
    assert resolve_res.status_code == 200
    assert resolve_res.json()["geo_validation"]["matched"] is True

    # 4. Citizen submits 5-star feedback
    feedback_res = client.post(f"/api/v1/complaints/{c_id}/feedback", json={
        "rating": 5,
        "comments": "Excellent rapid resolution!"
    })
    assert feedback_res.status_code == 200

def test_emergency_cad_flow():
    # 1. Citizen triggers SOS panic button
    sos_res = client.post("/api/v1/emergency/sos", json={
        "latitude": 19.0765,
        "longitude": 72.8775,
        "emergency_type": "MEDICAL",
        "contact_phone": "+91 98989 77777",
        "battery_level": 74
    })
    assert sos_res.status_code == 200
    sos_data = sos_res.json()
    assert sos_data["status"] == "SOS_BROADCAST_SUCCESS"
    emg_id = sos_data["emergency_id"]

    # 2. Check active CAD queue
    cad_res = client.get("/api/v1/emergency/cad/active")
    assert cad_res.status_code == 200
    incidents = cad_res.json()
    assert any(inc["id"] == emg_id for inc in incidents)

    # 3. Dispatch nearest unit
    target_inc = next(inc for inc in incidents if inc["id"] == emg_id)
    assert len(target_inc["nearest_units"]) > 0
    nearest_unit = target_inc["nearest_units"][0]

    disp_res = client.post(f"/api/v1/emergency/cad/{emg_id}/dispatch", json={
        "unit_id": nearest_unit["id"],
        "notes": "Immediate cardiac triage response"
    })
    assert disp_res.status_code == 200
    assert disp_res.json()["status"] == "UNIT_ASSIGNED"

def test_analytics_kpi():
    res = client.get("/api/v1/analytics/overview")
    assert res.status_code == 200
    data = res.json()
    assert "total_complaints" in data
    assert "sla_compliance_rate" in data
    assert "active_emergencies" in data

    heat_res = client.get("/api/v1/analytics/heatmaps")
    assert heat_res.status_code == 200
    assert len(heat_res.json()) > 0

if __name__ == "__main__":
    setup_module()
    print("Running test_health...")
    test_health()
    print("Running test_auth_role_switching...")
    test_auth_role_switching()
    print("Running test_citizen_registration_and_login...")
    test_citizen_registration_and_login()
    print("Running test_rbac_access_control...")
    test_rbac_access_control()
    print("Running test_ai_triage_nlp...")
    test_ai_triage_nlp()
    print("Running test_ai_citizen_assistant...")
    test_ai_citizen_assistant()
    print("Running test_complaint_lifecycle...")
    test_complaint_lifecycle()
    print("Running test_emergency_cad_flow...")
    test_emergency_cad_flow()
    print("Running test_analytics_kpi...")
    test_analytics_kpi()
    print("ALL TESTS PASSED SUCCESSFULLY!")
