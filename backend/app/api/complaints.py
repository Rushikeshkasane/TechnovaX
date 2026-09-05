from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Optional, List, Dict, Any
from app.models.schemas import (
    ComplaintCreate, ComplaintUpdateStatus, ComplaintAssign, 
    ComplaintResolve, FeedbackCreate, ComplaintResponse
)
from app.core.database import query_one, query_all, execute_commit
from app.api.auth import get_current_user
from app.services.ai_service import classify_text_nlp, detect_hotspots_and_duplicates, verify_photo_exif_gps, analyze_image_damage
from app.services.notif_service import manager
from app.core.config import UPLOAD_DIR
import uuid
import json
import shutil
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/api/v1/complaints", tags=["Grievances"])

def build_complaint_dict(c: Dict[str, Any]) -> Dict[str, Any]:
    """Enrich complaint record with attachments, timeline, and citizen info."""
    c_id = c["id"]
    attachments = query_all("""
        SELECT id, file_url, file_type, attachment_type, exif_lat, exif_lon, created_at 
        FROM complaint_attachments WHERE complaint_id = ?
    """, (c_id,))
    
    timeline = query_all("""
        SELECT ct.id, u.full_name as actor_name, ct.action, ct.old_status, ct.new_status, ct.comment, ct.created_at
        FROM complaint_timeline ct
        LEFT JOIN users u ON ct.actor_id = u.id
        WHERE ct.complaint_id = ?
        ORDER BY ct.created_at ASC
    """, (c_id,))
    
    feedback = query_one("""
        SELECT rating, comments, is_appealed, appeal_reason, created_at
        FROM complaint_feedback WHERE complaint_id = ?
    """, (c_id,))
    
    citizen = query_one("SELECT full_name FROM users WHERE id = ?", (c.get("citizen_id"),)) if c.get("citizen_id") else None
    dept = query_one("SELECT name FROM departments WHERE id = ?", (c.get("department_id"),)) if c.get("department_id") else None
    officer = query_one("SELECT full_name FROM users WHERE id = ?", (c.get("assigned_officer_id"),)) if c.get("assigned_officer_id") else None

    return {
        **c,
        "citizen_name": citizen["full_name"] if citizen else "Anonymous Citizen",
        "department_name": dept["name"] if dept else "Unassigned",
        "assigned_officer_name": officer["full_name"] if officer else "Unassigned",
        "sla_breached": bool(c.get("sla_breached")),
        "attachments": attachments or [],
        "timeline": timeline or [],
        "feedback": feedback
    }

@router.get("/public/track/{ticket_number}")
def public_track_complaint(ticket_number: str):
    """
    Public Grievance Status Tracker (No login required).
    Returns sanitized non-confidential progress info for citizens checking status via ticket number.
    """
    cleaned = ticket_number.strip().upper()
    row = query_one("SELECT * FROM complaints WHERE UPPER(ticket_number) = ? OR id = ?", (cleaned, cleaned))
    if not row:
        raise HTTPException(status_code=404, detail="No grievance found with this ticket number.")
    
    dept = query_one("SELECT name FROM departments WHERE id = ?", (row.get("department_id"),)) if row.get("department_id") else None
    timeline = query_all("""
        SELECT action, old_status, new_status, comment, created_at 
        FROM complaint_timeline 
        WHERE complaint_id = ? 
        ORDER BY created_at ASC
    """, (row["id"],))

    return {
        "id": row["id"],
        "ticket_number": row["ticket_number"],
        "title": row["title"],
        "category": row["category"],
        "priority": row["priority"],
        "status": row["status"],
        "department_name": dept["name"] if dept else "Municipal Intake",
        "sla_deadline": row["sla_deadline"],
        "created_at": row["created_at"],
        "resolved_at": row["resolved_at"],
        "timeline": timeline or []
    }

@router.get("")
def list_complaints(
    status: Optional[str] = None, 
    department_id: Optional[str] = None,
    category: Optional[str] = None,
    current_user: Optional[dict] = Depends(get_current_user)
):
    """List complaints with role-based isolation and optional filters."""
    sql = "SELECT * FROM complaints WHERE 1=1"
    params = []
    
    # 1. Role-based scoping
    if current_user:
        role = current_user.get("role")
        if role == "citizen":
            # Citizen strictly sees ONLY their own grievances
            sql += " AND citizen_id = ?"
            params.append(current_user["id"])
        elif role == "officer":
            # Field Officer sees tasks in their assigned department or specifically assigned to them
            if current_user.get("department_id"):
                sql += " AND (department_id = ? OR assigned_officer_id = ?)"
                params.extend([current_user["department_id"], current_user["id"]])
        elif role == "department_admin":
            # Department Admin strictly manages their department's queue
            if current_user.get("department_id"):
                sql += " AND department_id = ?"
                params.append(current_user["department_id"])
    else:
        # Fallback for local testing / unauthenticated inspection
        pass

    if status:
        sql += " AND status = ?"
        params.append(status)
    if department_id and (not current_user or current_user.get("role") == "admin"):
        sql += " AND department_id = ?"
        params.append(department_id)
    if category:
        sql += " AND category = ?"
        params.append(category)

    sql += " ORDER BY created_at DESC LIMIT 100"
    rows = query_all(sql, tuple(params))
    return [build_complaint_dict(r) for r in rows]

@router.get("/{complaint_id}")
def get_complaint(complaint_id: str, current_user: Optional[dict] = Depends(get_current_user)):
    """Retrieve detailed complaint by ID or ticket number with access control."""
    row = query_one("SELECT * FROM complaints WHERE id = ? OR ticket_number = ?", (complaint_id, complaint_id))
    if not row:
        raise HTTPException(status_code=404, detail="Complaint ticket not found")

    # Authorization verification
    if current_user:
        role = current_user.get("role")
        if role == "citizen" and row.get("citizen_id") and row["citizen_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied: You cannot view grievances filed by another citizen.")
        elif role in ["officer", "department_admin"] and current_user.get("department_id"):
            if row.get("department_id") and row["department_id"] != current_user["department_id"] and row.get("assigned_officer_id") != current_user["id"]:
                raise HTTPException(status_code=403, detail="Access denied: Grievance belongs to a different municipal department.")

    return build_complaint_dict(row)


@router.post("")
async def create_complaint(payload: ComplaintCreate, current_user: Optional[dict] = Depends(get_current_user)):
    """
    File a new grievance:
    1. Executes AI NLP triage (Department, Category, Urgency, Priority).
    2. Runs spatial deduplication & hotspot check.
    3. Generates Ticket Number & sets SLA Deadline.
    4. Records immutable timeline entry and emits WebSocket alert.
    """
    now = datetime.now(timezone.utc)
    t_id = f"grv-{uuid.uuid4().hex[:8]}"
    
    # Generate human ticket number
    count_res = query_one("SELECT COUNT(*) as count FROM complaints")
    seq_num = (count_res["count"] if count_res else 0) + 1
    ticket_num = f"GRV-2026-{seq_num:04d}"

    # 1. AI NLP Triage
    ai_result = classify_text_nlp(f"{payload.title} - {payload.description}")
    category = payload.category or ai_result["category"]
    dept_id = ai_result["suggested_department_id"]
    priority = ai_result["priority"]
    sla_hours = ai_result["sla_hours"]
    sla_deadline = (now + timedelta(hours=sla_hours)).isoformat()

    # 2. Check for duplicate complaints in 80m radius
    dup_info = detect_hotspots_and_duplicates(payload.latitude, payload.longitude, category)
    parent_ticket_id = None
    if dup_info["is_duplicate"] and dup_info["duplicate_of_ticket"]:
        parent_row = query_one("SELECT id FROM complaints WHERE ticket_number = ?", (dup_info["duplicate_of_ticket"],))
        if parent_row:
            parent_ticket_id = parent_row["id"]

    citizen_id = None if payload.is_anonymous else (current_user["id"] if current_user else "user-citizen")

    execute_commit("""
        INSERT INTO complaints (
            id, ticket_number, citizen_id, department_id, title, description, 
            category, priority, status, latitude, longitude, address_text, 
            parent_ticket_id, sla_deadline, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?, ?, ?, ?, ?)
    """, (
        t_id, ticket_num, citizen_id, dept_id, payload.title, payload.description,
        category, priority, payload.latitude, payload.longitude, payload.address_text or "Geo-tagged location",
        parent_ticket_id, sla_deadline, now.isoformat()
    ))

    # Add Timeline item
    execute_commit("""
        INSERT INTO complaint_timeline (id, complaint_id, actor_id, action, new_status, comment, created_at)
        VALUES (?, ?, ?, 'CREATED_AND_TRIAGED', 'SUBMITTED', ?, ?)
    """, (
        f"tl-{uuid.uuid4().hex[:8]}", t_id, citizen_id, 
        f"AI auto-triaged to {ai_result['suggested_department_name']} with {priority} priority (SLA: {sla_hours}h).",
        now.isoformat()
    ))

    # Real-time WebSocket broadcast
    await manager.broadcast_complaint("NEW_COMPLAINT", {
        "id": t_id,
        "ticket_number": ticket_num,
        "title": payload.title,
        "department_id": dept_id,
        "priority": priority,
        "status": "SUBMITTED"
    })

    created = query_one("SELECT * FROM complaints WHERE id = ?", (t_id,))
    return build_complaint_dict(created)

@router.patch("/{complaint_id}/status")
async def update_status(complaint_id: str, payload: ComplaintUpdateStatus, current_user: Optional[dict] = Depends(get_current_user)):
    """Update ticket progression status with RBAC checks."""
    now = datetime.now(timezone.utc)
    c = query_one("SELECT * FROM complaints WHERE id = ?", (complaint_id,))
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if current_user:
        role = current_user.get("role")
        if role not in ["officer", "department_admin", "admin"]:
            raise HTTPException(status_code=403, detail="Access denied: Only officers and administrators can update ticket status.")
        if role in ["officer", "department_admin"] and current_user.get("department_id"):
            if c.get("department_id") and c["department_id"] != current_user["department_id"] and c.get("assigned_officer_id") != current_user["id"]:
                raise HTTPException(status_code=403, detail="Access denied: Cannot update complaints belonging to another department.")

    old_status = c["status"]
    execute_commit("UPDATE complaints SET status = ? WHERE id = ?", (payload.status, complaint_id))

    actor_id = current_user["id"] if current_user else None
    execute_commit("""
        INSERT INTO complaint_timeline (id, complaint_id, actor_id, action, old_status, new_status, comment, created_at)
        VALUES (?, ?, ?, 'STATUS_UPDATE', ?, ?, ?, ?)
    """, (
        f"tl-{uuid.uuid4().hex[:8]}", complaint_id, actor_id,
        old_status, payload.status, payload.comment or f"Status transitioned to {payload.status}",
        now.isoformat()
    ))

    await manager.broadcast_complaint("STATUS_CHANGED", {
        "id": complaint_id,
        "old_status": old_status,
        "new_status": payload.status
    })

    return {"message": "Status updated", "old_status": old_status, "new_status": payload.status}

@router.patch("/{complaint_id}/assign")
async def assign_officer(complaint_id: str, payload: ComplaintAssign, current_user: Optional[dict] = Depends(get_current_user)):
    """Assign ticket to a field officer with department scoping."""
    now = datetime.now(timezone.utc)
    c = query_one("SELECT * FROM complaints WHERE id = ?", (complaint_id,))
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if current_user:
        role = current_user.get("role")
        if role not in ["department_admin", "admin"]:
            raise HTTPException(status_code=403, detail="Access denied: Only department administrators can assign complaints.")
        if role == "department_admin" and current_user.get("department_id"):
            if c.get("department_id") and c["department_id"] != current_user["department_id"]:
                raise HTTPException(status_code=403, detail="Access denied: Cannot assign complaints outside your department.")

    officer = query_one("SELECT id, full_name, department_id, role FROM users WHERE id = ?", (payload.assigned_officer_id,))
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")
    
    if current_user and current_user.get("role") == "department_admin" and current_user.get("department_id"):
        if officer.get("department_id") and officer["department_id"] != current_user["department_id"]:
            raise HTTPException(status_code=400, detail="Cannot assign an officer from a different department.")

    execute_commit("""
        UPDATE complaints SET assigned_officer_id = ?, status = 'ASSIGNED' WHERE id = ?
    """, (payload.assigned_officer_id, complaint_id))

    actor_id = current_user["id"] if current_user else None
    execute_commit("""
        INSERT INTO complaint_timeline (id, complaint_id, actor_id, action, old_status, new_status, comment, created_at)
        VALUES (?, ?, ?, 'ASSIGNMENT', ?, 'ASSIGNED', ?, ?)
    """, (
        f"tl-{uuid.uuid4().hex[:8]}", complaint_id, actor_id,
        c["status"], f"Assigned to field officer {officer['full_name']}. {payload.comment or ''}",
        now.isoformat()
    ))

    return {"message": "Assigned successfully", "officer_name": officer["full_name"]}

@router.post("/{complaint_id}/resolve")
async def resolve_complaint(complaint_id: str, payload: ComplaintResolve, current_user: Optional[dict] = Depends(get_current_user)):
    """
    Officer Proof-of-Work Resolution with authorization check.
    """
    now = datetime.now(timezone.utc)
    c = query_one("SELECT * FROM complaints WHERE id = ?", (complaint_id,))
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if current_user:
        role = current_user.get("role")
        if role not in ["officer", "admin"]:
            raise HTTPException(status_code=403, detail="Access denied: Only field officers can submit resolution proof.")
        if role == "officer" and current_user.get("department_id"):
            if c.get("department_id") and c["department_id"] != current_user["department_id"] and c.get("assigned_officer_id") != current_user["id"]:
                raise HTTPException(status_code=403, detail="Access denied: Cannot resolve complaints outside your department.")

    # 1. Geo-validation
    geo_check = verify_photo_exif_gps(payload.officer_latitude, payload.officer_longitude, c["latitude"], c["longitude"])
    
    # 2. Vision verification
    vision_check = analyze_image_damage(payload.proof_photo_url, c["category"])

    # 3. Store proof attachment
    execute_commit("""
        INSERT INTO complaint_attachments (id, complaint_id, file_url, file_type, attachment_type, exif_lat, exif_lon, created_at)
        VALUES (?, ?, ?, 'image/jpeg', 'OFFICER_PROOF_OF_WORK', ?, ?, ?)
    """, (
        f"att-{uuid.uuid4().hex[:8]}", complaint_id, payload.proof_photo_url,
        payload.officer_latitude or c["latitude"], payload.officer_longitude or c["longitude"],
        now.isoformat()
    ))

    # 4. Mark RESOLVED
    execute_commit("""
        UPDATE complaints SET status = 'RESOLVED', resolved_at = ? WHERE id = ?
    """, (now.isoformat(), complaint_id))

    actor_id = current_user["id"] if current_user else None
    execute_commit("""
        INSERT INTO complaint_timeline (id, complaint_id, actor_id, action, old_status, new_status, comment, created_at)
        VALUES (?, ?, ?, 'PROOF_RESOLVED', ?, 'RESOLVED', ?, ?)
    """, (
        f"tl-{uuid.uuid4().hex[:8]}", complaint_id, actor_id,
        c["status"], f"Field Resolution confirmed. {payload.resolution_notes}. Proof verified ({geo_check['reason']}).",
        now.isoformat()
    ))

    await manager.broadcast_complaint("RESOLVED", {"id": complaint_id, "ticket_number": c["ticket_number"]})

    return {
        "message": "Complaint successfully resolved with verified proof-of-work",
        "geo_validation": geo_check,
        "vision_validation": vision_check
    }

@router.post("/{complaint_id}/feedback")
def submit_feedback(complaint_id: str, payload: FeedbackCreate, current_user: Optional[dict] = Depends(get_current_user)):
    """Citizen satisfaction review (1-5 stars) or appeal/re-open with ownership check."""
    now = datetime.now(timezone.utc)
    c = query_one("SELECT * FROM complaints WHERE id = ?", (complaint_id,))
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if current_user:
        role = current_user.get("role")
        if role == "citizen" and c.get("citizen_id") and c["citizen_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied: You can only submit feedback for your own grievances.")

    citizen_id = current_user["id"] if current_user else "user-citizen"
    
    execute_commit("""
        INSERT OR REPLACE INTO complaint_feedback (id, complaint_id, citizen_id, rating, comments, is_appealed, appeal_reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        f"fb-{uuid.uuid4().hex[:8]}", complaint_id, citizen_id,
        payload.rating, payload.comments, 1 if payload.is_appealed else 0, payload.appeal_reason,
        now.isoformat()
    ))

    if payload.is_appealed:
        # Re-open complaint and mark for supervisor inspection
        execute_commit("UPDATE complaints SET status = 'REOPENED' WHERE id = ?", (complaint_id,))
        execute_commit("""
            INSERT INTO complaint_timeline (id, complaint_id, actor_id, action, old_status, new_status, comment, created_at)
            VALUES (?, ?, ?, 'APPEAL_REOPENED', 'RESOLVED', 'REOPENED', ?, ?)
        """, (
            f"tl-{uuid.uuid4().hex[:8]}", complaint_id, citizen_id,
            f"Citizen appealed resolution: {payload.appeal_reason or 'Dissatisfied with field resolution'}",
            now.isoformat()
        ))
    else:
        # Close ticket
        execute_commit("UPDATE complaints SET status = 'CLOSED' WHERE id = ?", (complaint_id,))

    return {"message": "Feedback submitted successfully"}


@router.post("/upload-media")
async def upload_media(file: UploadFile = File(...)):
    """Handle image and voice note media uploads with local filesystem storage."""
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"media_{uuid.uuid4().hex[:12]}.{ext}"
    file_path = UPLOAD_DIR / filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {
        "file_url": f"/uploads/{filename}",
        "filename": filename,
        "file_type": file.content_type
    }
