from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

# ================= AUTH SCHEMAS =================
class UserLogin(BaseModel):
    phone_or_email: str
    password: Optional[str] = None
    otp: Optional[str] = None
    expected_role: Optional[str] = None

class CitizenRegisterRequest(BaseModel):
    full_name: str
    email: str
    phone: str
    password: str
    confirm_password: str
    address: str
    city: str
    terms_accepted: bool = False

class UserRegister(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: str
    password: str
    role: str = "citizen"
    department_id: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None

class RoleSwitchRequest(BaseModel):
    target_role: str

class UserResponse(BaseModel):
    id: str
    full_name: str
    email: Optional[str] = None
    phone: str
    role: str
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    is_active: bool = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ================= COMPLAINT SCHEMAS =================
class ComplaintCreate(BaseModel):
    title: str
    description: str
    category: Optional[str] = None
    latitude: float
    longitude: float
    address_text: Optional[str] = None
    is_anonymous: bool = False

class ComplaintUpdateStatus(BaseModel):
    status: str
    comment: Optional[str] = None

class ComplaintAssign(BaseModel):
    assigned_officer_id: str
    comment: Optional[str] = None

class ComplaintResolve(BaseModel):
    proof_photo_url: str
    resolution_notes: str
    officer_latitude: Optional[float] = None
    officer_longitude: Optional[float] = None

class FeedbackCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comments: Optional[str] = None
    is_appealed: bool = False
    appeal_reason: Optional[str] = None

class AttachmentResponse(BaseModel):
    id: str
    file_url: str
    file_type: str
    attachment_type: str
    exif_lat: Optional[float] = None
    exif_lon: Optional[float] = None
    created_at: str

class TimelineResponse(BaseModel):
    id: str
    actor_name: Optional[str] = None
    action: str
    old_status: Optional[str] = None
    new_status: Optional[str] = None
    comment: Optional[str] = None
    created_at: str

class ComplaintResponse(BaseModel):
    id: str
    ticket_number: str
    citizen_id: Optional[str] = None
    citizen_name: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    assigned_officer_id: Optional[str] = None
    assigned_officer_name: Optional[str] = None
    title: str
    description: str
    category: str
    priority: str
    status: str
    latitude: float
    longitude: float
    address_text: Optional[str] = None
    sla_deadline: Optional[str] = None
    sla_breached: bool = False
    created_at: str
    resolved_at: Optional[str] = None
    attachments: List[AttachmentResponse] = []
    timeline: List[TimelineResponse] = []
    feedback: Optional[Dict[str, Any]] = None

# ================= EMERGENCY / CAD SCHEMAS =================
class SOSTriggerRequest(BaseModel):
    latitude: float
    longitude: float
    emergency_type: str = "PANIC_BUTTON"
    contact_phone: Optional[str] = None
    address_text: Optional[str] = None
    battery_level: Optional[int] = None
    ambient_audio_base64: Optional[str] = None

class EmergencyUnitResponse(BaseModel):
    id: str
    unit_callsign: str
    unit_type: str
    status: str
    current_lat: float
    current_lon: float
    speed_kmh: float = 0.0
    heading_deg: float = 0.0
    distance_meters: Optional[float] = None
    eta_minutes: Optional[float] = None
    last_ping_at: str

class DispatchUnitRequest(BaseModel):
    unit_id: str
    notes: Optional[str] = None

class UnitTelemetryUpdate(BaseModel):
    unit_id: str
    latitude: float
    longitude: float
    speed_kmh: Optional[float] = 0.0
    heading_deg: Optional[float] = 0.0
    status: Optional[str] = None

class EmergencyIncidentResponse(BaseModel):
    id: str
    incident_code: str
    contact_phone: str
    emergency_type: str
    priority: str
    status: str
    latitude: float
    longitude: float
    address_text: Optional[str] = None
    battery_level: Optional[int] = None
    created_at: str
    assigned_unit: Optional[EmergencyUnitResponse] = None
    nearest_units: List[EmergencyUnitResponse] = []

# ================= AI SCHEMAS =================
class AITriageRequest(BaseModel):
    text: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_url: Optional[str] = None

class AITriageResponse(BaseModel):
    suggested_department_id: str
    suggested_department_name: str
    category: str
    priority: str
    urgency_score: float # 0.0 to 1.0
    sentiment: str # POSITIVE, NEUTRAL, CRITICAL, PANIC
    summary: str
    sla_hours: int
    is_duplicate: bool = False
    duplicate_of_ticket: Optional[str] = None
    vision_detected_issues: List[str] = []

class ChatAssistantRequest(BaseModel):
    message: str
    ticket_id: Optional[str] = None

class ChatAssistantResponse(BaseModel):
    reply: str
    action_suggested: Optional[str] = None
    relevant_ticket_number: Optional[str] = None

# ================= ANALYTICS & ADMIN SCHEMAS =================
class AnalyticsOverviewResponse(BaseModel):
    total_complaints: int
    pending_complaints: int
    resolved_complaints: int
    escalated_complaints: int
    sla_compliance_rate: float
    average_resolution_hours: float
    average_citizen_satisfaction: float
    active_emergencies: int
    available_units: int

class HeatmapPoint(BaseModel):
    latitude: float
    longitude: float
    weight: float
    category: str
    priority: str

class DeptPerformance(BaseModel):
    department_id: str
    department_name: str
    code: str
    total_tickets: int
    resolved_tickets: int
    sla_breaches: int
    compliance_percent: float

class AuditLogResponse(BaseModel):
    id: int
    user_name: Optional[str] = None
    ip_address: str
    action: str
    entity_type: str
    entity_id: str
    diff_payload: Optional[str] = None
    created_at: str
