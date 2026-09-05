from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from app.core.database import query_all, execute_commit
from app.api.auth import get_current_user, require_roles
from pathlib import Path
import sys

router = APIRouter(prefix="/api/v1/admin", tags=["Administration & Governance"])

@router.get("/users")
def list_system_users(department_id: Optional[str] = None, current_user: Optional[dict] = Depends(get_current_user)):
    """
    List system users:
    - System Admins: see all users.
    - Department Admins: strictly see only officers in their own department.
    - Citizens/Officers: access forbidden.
    """
    if current_user:
        role = current_user.get("role")
        if role == "citizen" or role == "officer":
            raise HTTPException(status_code=403, detail="Access denied: You do not have permission to view staff directories.")
        if role == "department_admin":
            dept_id = current_user.get("department_id")
            return query_all("""
                SELECT u.id, u.full_name, u.email, u.phone, u.role, u.is_active, d.name as department_name
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.id
                WHERE u.department_id = ? AND u.role = 'officer'
                ORDER BY u.full_name ASC
            """, (dept_id,))

    sql = """
        SELECT u.id, u.full_name, u.email, u.phone, u.role, u.is_active, d.name as department_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
    """
    params = []
    if department_id:
        sql += " WHERE u.department_id = ?"
        params.append(department_id)
    sql += " ORDER BY u.created_at ASC"
    return query_all(sql, tuple(params))

@router.get("/audit-logs")
def list_audit_logs(current_user: Optional[dict] = Depends(get_current_user)):
    """Retrieve immutable audit ledger entries (System Admin restricted)."""
    if current_user and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied: Audit logs are restricted to System Administrators.")

    return query_all("""
        SELECT al.id, u.full_name as user_name, al.ip_address, al.action, al.entity_type, al.entity_id, al.diff_payload, al.created_at
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.id DESC
        LIMIT 100
    """)

@router.post("/seed-reset")
def reset_seed_data(current_user: Optional[dict] = Depends(get_current_user)):
    """Re-seed database to baseline state for demonstrations (Admin only)."""
    if current_user and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied: System Administration privileges required to reset database.")

    from database.seed_data import seed_all
    seed_all()
    return {"message": "Database successfully reset and re-seeded to demo baseline."}

