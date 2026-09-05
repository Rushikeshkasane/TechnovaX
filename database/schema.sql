-- =====================================================================
-- Enterprise AI Service Desk, Public-Grievance & Emergency Response Platform
-- Database Schema Definition (PostgreSQL + PostGIS & SQLite Compatible)
-- =====================================================================

-- 1. DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(128) NOT NULL UNIQUE,
    code VARCHAR(16) NOT NULL UNIQUE,
    head_user_id VARCHAR(36),
    contact_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS & ROLES
-- Roles: citizen, officer, department_admin, ert_responder, admin
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(32) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(128) NOT NULL,
    role VARCHAR(32) NOT NULL,
    department_id VARCHAR(36),
    address VARCHAR(255),
    city VARCHAR(100),
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);


-- 3. JURISDICTIONS (Wards & Geographic Zones)
CREATE TABLE IF NOT EXISTS jurisdictions (
    id VARCHAR(36) PRIMARY KEY,
    department_id VARCHAR(36) NOT NULL,
    ward_number VARCHAR(32) NOT NULL,
    name VARCHAR(128) NOT NULL,
    boundary_geojson TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- 4. COMPLAINTS (Public Grievances)
-- Statuses: SUBMITTED, AI_TRIAGING, ACKNOWLEDGED, ASSIGNED, IN_PROGRESS, ESCALATED, RESOLVED, CLOSED, REOPENED
-- Priorities: P1_CRITICAL, P2_HIGH, P3_MEDIUM, P4_LOW
CREATE TABLE IF NOT EXISTS complaints (
    id VARCHAR(36) PRIMARY KEY,
    ticket_number VARCHAR(32) NOT NULL UNIQUE,
    citizen_id VARCHAR(36),
    department_id VARCHAR(36),
    assigned_officer_id VARCHAR(36),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(64) NOT NULL,
    priority VARCHAR(16) NOT NULL DEFAULT 'P3_MEDIUM',
    status VARCHAR(32) NOT NULL DEFAULT 'SUBMITTED',
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    address_text TEXT,
    parent_ticket_id VARCHAR(36),
    sla_deadline TIMESTAMP,
    sla_breached INTEGER DEFAULT 0,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (citizen_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_officer_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_ticket_id) REFERENCES complaints(id) ON DELETE SET NULL
);

-- 5. COMPLAINT ATTACHMENTS (Citizen Evidence & Officer Proof-of-Work)
-- Attachment types: CITIZEN_SUBMISSION, OFFICER_PROOF_OF_WORK
CREATE TABLE IF NOT EXISTS complaint_attachments (
    id VARCHAR(36) PRIMARY KEY,
    complaint_id VARCHAR(36) NOT NULL,
    file_url VARCHAR(512) NOT NULL,
    file_type VARCHAR(32) NOT NULL,
    attachment_type VARCHAR(32) NOT NULL,
    exif_lat REAL,
    exif_lon REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
);

-- 6. COMPLAINT TIMELINE (Immutable Action History)
CREATE TABLE IF NOT EXISTS complaint_timeline (
    id VARCHAR(36) PRIMARY KEY,
    complaint_id VARCHAR(36) NOT NULL,
    actor_id VARCHAR(36),
    action VARCHAR(64) NOT NULL,
    old_status VARCHAR(32),
    new_status VARCHAR(32),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 7. COMPLAINT FEEDBACK (Citizen Satisfaction & Appeals)
CREATE TABLE IF NOT EXISTS complaint_feedback (
    id VARCHAR(36) PRIMARY KEY,
    complaint_id VARCHAR(36) NOT NULL UNIQUE,
    citizen_id VARCHAR(36) NOT NULL,
    rating INTEGER NOT NULL, -- 1 to 5 stars
    comments TEXT,
    is_appealed INTEGER DEFAULT 0,
    appeal_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
    FOREIGN KEY (citizen_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. EMERGENCIES (High-Velocity SOS Incidents)
-- Statuses: TRIGGERED, DISPATCH_PENDING, UNIT_ASSIGNED, EN_ROUTE, ON_SCENE, CONTAINED, CLOSED
-- Types: MEDICAL, FIRE, POLICE, DISASTER, PANIC_BUTTON
CREATE TABLE IF NOT EXISTS emergencies (
    id VARCHAR(36) PRIMARY KEY,
    incident_code VARCHAR(32) NOT NULL UNIQUE,
    citizen_id VARCHAR(36),
    contact_phone VARCHAR(32) NOT NULL,
    emergency_type VARCHAR(32) NOT NULL,
    priority VARCHAR(16) NOT NULL DEFAULT 'P1_CRITICAL',
    status VARCHAR(32) NOT NULL DEFAULT 'TRIGGERED',
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    address_text TEXT,
    battery_level INTEGER,
    audio_clip_url VARCHAR(512),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (citizen_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 9. EMERGENCY UNITS (Response Fleet)
-- Unit types: AMBULANCE, FIRE_TRUCK, POLICE_CAR, RESCUE_BOAT
-- Statuses: AVAILABLE, DISPATCHED, EN_ROUTE, ON_SCENE, OUT_OF_SERVICE
CREATE TABLE IF NOT EXISTS emergency_units (
    id VARCHAR(36) PRIMARY KEY,
    unit_callsign VARCHAR(64) NOT NULL UNIQUE,
    unit_type VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
    current_lat REAL NOT NULL,
    current_lon REAL NOT NULL,
    speed_kmh REAL DEFAULT 0.0,
    heading_deg REAL DEFAULT 0.0,
    last_ping_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. EMERGENCY DISPATCHES (Unit Incident Assignment)
CREATE TABLE IF NOT EXISTS emergency_dispatches (
    id VARCHAR(36) PRIMARY KEY,
    emergency_id VARCHAR(36) NOT NULL,
    unit_id VARCHAR(36) NOT NULL,
    dispatched_by VARCHAR(36),
    dispatched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    arrived_at TIMESTAMP,
    cleared_at TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (emergency_id) REFERENCES emergencies(id) ON DELETE CASCADE,
    FOREIGN KEY (unit_id) REFERENCES emergency_units(id) ON DELETE CASCADE,
    FOREIGN KEY (dispatched_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 11. AUDIT LOGS (Immutable Governance Ledger)
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(36),
    ip_address VARCHAR(45) NOT NULL,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    diff_payload TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- INDEXES FOR HIGH-THROUGHPUT RETRIEVAL
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_dept ON complaints(department_id);
CREATE INDEX IF NOT EXISTS idx_complaints_officer ON complaints(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_complaints_coords ON complaints(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_emergencies_status ON emergencies(status);
CREATE INDEX IF NOT EXISTS idx_units_status ON emergency_units(status);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
