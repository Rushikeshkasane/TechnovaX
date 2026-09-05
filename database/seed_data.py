import json
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys
from database.seed_data import seed_all

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.core.database import get_db, init_db
from app.core.security import hash_password

def seed_all():
    init_db()
    now = datetime.now(timezone.utc)
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. DEPARTMENTS
        departments = [
            ("dept-roads", "Roads & Infrastructure", "RND", "roads@civic.gov"),
            ("dept-water", "Water Supply & Sewage", "WTR", "water@civic.gov"),
            ("dept-waste", "Solid Waste Management & Sanitation", "SAN", "sanitation@civic.gov"),
            ("dept-power", "Power & Streetlights", "PWR", "power@civic.gov"),
            ("dept-emergency", "Emergency Response Services", "ERT", "emergency@civic.gov"),
        ]
        for dept_id, name, code, email in departments:
            cursor.execute("""
                INSERT OR IGNORE INTO departments (id, name, code, contact_email, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (dept_id, name, code, email, now.isoformat()))
            
        # 2. USERS
        users = [
            ("user-citizen", "citizen@civic.gov", "+91 98765 43210", hash_password("citizen123"), "Aarav Sharma", "citizen", None, "14B Hill Road, Bandra West", "Mumbai"),
            ("user-officer", "officer@civic.gov", "+91 98765 43211", hash_password("officer123"), "Inspector Rajesh Patil", "officer", "dept-roads", "Municipal Ward K-West Depot", "Mumbai"),
            ("user-dept-head", "dept_head@civic.gov", "+91 98765 43212", hash_password("dept123"), "Dr. Sunita Rao", "department_admin", "dept-roads", "Civic HQ, Annex Building", "Mumbai"),
            ("user-officer-water", "officer_water@civic.gov", "+91 98765 43215", hash_password("officerwater123"), "Engineer Vikram Kulkarni", "officer", "dept-water", "Bandra Water Pumping Station", "Mumbai"),
            ("user-dept-head-water", "dept_head_water@civic.gov", "+91 98765 43216", hash_password("deptwater123"), "Chief Eng. Meera Deshmukh", "department_admin", "dept-water", "Water Works Directorate", "Mumbai"),
            ("user-ert", "cad_dispatcher@civic.gov", "+91 98765 43213", hash_password("ert123"), "Commander Vikram Singh", "ert_responder", "dept-emergency", "Central CAD Dispatch Command", "Mumbai"),
            ("user-admin", "admin@civic.gov", "+91 98765 43214", hash_password("admin123"), "Municipal Chief Executive", "admin", None, "Municipal Corporation HQ", "Mumbai"),
        ]
        for u_id, email, phone, pwd_hash, name, role, dept, addr, cty in users:
            cursor.execute("""
                INSERT OR REPLACE INTO users (id, email, phone, password_hash, full_name, role, department_id, address, city, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
            """, (u_id, email, phone, pwd_hash, name, role, dept, addr, cty, now.isoformat()))

            
        # 3. JURISDICTIONS (Wards)
        wards = [
            ("ward-a", "dept-roads", "Ward A", "Colaba South Zone", json.dumps({"type": "Polygon", "coordinates": [[[72.82, 18.90], [72.84, 18.90], [72.84, 18.93], [72.82, 18.93], [72.82, 18.90]]]})),
            ("ward-k", "dept-roads", "Ward K-West", "Andheri West Civic Beat", json.dumps({"type": "Polygon", "coordinates": [[[72.82, 19.11], [72.85, 19.11], [72.85, 19.14], [72.82, 19.14], [72.82, 19.11]]]})),
            ("ward-h", "dept-water", "Ward H-East", "Bandra East Water Utility", json.dumps({"type": "Polygon", "coordinates": [[[72.84, 19.05], [72.87, 19.05], [72.87, 19.08], [72.84, 19.08], [72.84, 19.05]]]})),
        ]
        for w_id, dept, ward_num, name, poly in wards:
            cursor.execute("""
                INSERT OR IGNORE INTO jurisdictions (id, department_id, ward_number, name, boundary_geojson, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (w_id, dept, ward_num, name, poly, now.isoformat()))
            
        # 4. EMERGENCY UNITS (Fleet)
        units = [
            ("unit-amb-1", "MEDIC-AMBULANCE-01", "AMBULANCE", "AVAILABLE", 19.0760, 72.8777, 0.0, 0.0),
            ("unit-fire-1", "FIRE-ENGINE-04", "FIRE_TRUCK", "AVAILABLE", 19.0820, 72.8820, 0.0, 0.0),
            ("unit-pol-1", "PATROL-CRUISER-09", "POLICE_CAR", "AVAILABLE", 19.0710, 72.8710, 0.0, 0.0),
            ("unit-rescue-1", "RESCUE-BOAT-02", "RESCUE_BOAT", "AVAILABLE", 19.0650, 72.8650, 0.0, 0.0),
        ]
        for u_id, callsign, u_type, status, lat, lon, spd, hdg in units:
            cursor.execute("""
                INSERT OR REPLACE INTO emergency_units (id, unit_callsign, unit_type, status, current_lat, current_lon, speed_kmh, heading_deg, last_ping_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (u_id, callsign, u_type, status, lat, lon, spd, hdg, now.isoformat()))

            
        # 5. SAMPLE ACTIVE EMERGENCY INCIDENT FOR IMMEDIATE CAD TESTING
        cursor.execute("""
            INSERT OR IGNORE INTO emergencies (id, incident_code, citizen_id, contact_phone, emergency_type, priority, status, latitude, longitude, address_text, battery_level, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "emg-active-01",
            "SOS-2026-00101",
            "user-citizen",
            "+91 98200 11223",
            "MEDICAL",
            "P1_CRITICAL",
            "DISPATCH_PENDING",
            19.0775,
            72.8790,
            "Near BKC Commercial Complex, Bandra East, Mumbai",
            82,
            (now - timedelta(minutes=4)).isoformat()
        ))
        
        # 6. SAMPLE COMPLAINTS IN VARIOUS STATES
        complaints_data = [
            (
                "grv-0001",
                "GRV-2026-0001",
                "user-citizen",
                "dept-roads",
                "user-officer",
                "Severe Deep Pothole on S.V. Road Junction",
                "Large 3-foot wide pothole causing vehicle axle damage and severe traffic jam during peak hours.",
                "pothole",
                "P2_HIGH",
                "IN_PROGRESS",
                19.0620,
                72.8350,
                "S.V. Road, Near Milan Subway, Santacruz West, Mumbai",
                (now + timedelta(hours=14)).isoformat(),
                (now - timedelta(hours=10)).isoformat(),
                None
            ),
            (
                "grv-0002",
                "GRV-2026-0002",
                "user-citizen",
                "dept-water",
                None,
                "Major Underground Water Pipeline Rupture",
                "Clean potable water gushing at high pressure from pavement rupture, submerging road.",
                "water_leak",
                "P1_CRITICAL",
                "ASSIGNED",
                19.0780,
                72.8620,
                "CST Road, Kalina, Santacruz East, Mumbai",
                (now + timedelta(hours=3)).isoformat(),
                (now - timedelta(hours=2)).isoformat(),
                None
            ),
            (
                "grv-0003",
                "GRV-2026-0003",
                "user-citizen",
                "dept-waste",
                None,
                "Uncollected Municipal Garbage Dump Near School",
                "Municipal garbage bin has not been cleared for 4 days. Strong odor and stray dogs threatening pedestrians.",
                "garbage",
                "P3_MEDIUM",
                "SUBMITTED",
                19.0910,
                72.8420,
                "Vile Parle East Market Road, Mumbai",
                (now + timedelta(hours=36)).isoformat(),
                (now - timedelta(hours=1)).isoformat(),
                None
            ),
            (
                "grv-0004",
                "GRV-2026-0004",
                "user-citizen",
                "dept-power",
                "user-officer",
                "String of 8 Streetlights Non-Functional on Coastal Road",
                "Complete blackout on 400m curve section of road posing extreme night accident hazard.",
                "streetlight",
                "P2_HIGH",
                "RESOLVED",
                19.0180,
                72.8150,
                "Worli Seaface Promenade, Mumbai",
                (now - timedelta(hours=12)).isoformat(),
                (now - timedelta(days=2)).isoformat(),
                (now - timedelta(hours=5)).isoformat()
            )
        ]
        
        for c_id, t_num, cit_id, dept_id, off_id, title, desc, cat, prio, stat, lat, lon, addr, sla, created, resolved in complaints_data:
            cursor.execute("""
                INSERT OR IGNORE INTO complaints (id, ticket_number, citizen_id, department_id, assigned_officer_id, title, description, category, priority, status, latitude, longitude, address_text, sla_deadline, created_at, resolved_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (c_id, t_num, cit_id, dept_id, off_id, title, desc, cat, prio, stat, lat, lon, addr, sla, created, resolved))
            
            # Add timeline item
            cursor.execute("""
                INSERT OR IGNORE INTO complaint_timeline (id, complaint_id, actor_id, action, old_status, new_status, comment, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (f"tl-{c_id}-1", c_id, cit_id, "TICKET_CREATED", None, "SUBMITTED", "Grievance filed by citizen with geo-tagging.", created))
            
        # Add feedback for resolved complaint
        cursor.execute("""
            INSERT OR IGNORE INTO complaint_feedback (id, complaint_id, citizen_id, rating, comments, is_appealed, created_at)
            VALUES (?, ?, ?, ?, ?, 0, ?)
        """, (
            "fb-0004",
            "grv-0004",
            "user-citizen",
            5,
            "Rapid response! Streetlights repaired within 12 hours. Appreciated!",
            now.isoformat()
        ))
        
        # Add sample audit log
        cursor.execute("""
            INSERT OR IGNORE INTO audit_logs (id, user_id, ip_address, action, entity_type, entity_id, diff_payload, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            1,
            "user-admin",
            "127.0.0.1",
            "SYSTEM_SEED_INITIALIZED",
            "SYSTEM",
            "INIT",
            json.dumps({"departments": 5, "users": 5, "units": 4}),
            now.isoformat()
        ))
        
    print(f"[Seed] Successfully populated demo data: 5 departments, 5 users, 4 complaints, 4 emergency units, 1 active CAD incident.")

if __name__ == "__main__":
    seed_all()
