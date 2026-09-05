from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from app.models.schemas import (
    UserLogin, UserRegister, CitizenRegisterRequest, UserResponse, 
    TokenResponse, RoleSwitchRequest
)
from app.core.database import query_one, query_all, execute_commit
from app.core.security import verify_password, hash_password, create_access_token, decode_access_token
import uuid
import re
from datetime import datetime, timezone

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Dependency to extract authenticated user from Bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    user = query_one(
        """
        SELECT u.id, u.email, u.phone, u.full_name, u.role, u.department_id, 
               u.address, u.city, u.is_active, d.name as department_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.id = ?
        """, 
        (user_id,)
    )
    return user

def get_required_user(authorization: Optional[str] = Header(None)) -> dict:
    """Dependency to enforce authenticated Bearer token and return active user."""
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required. Please log in.")
    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Account is deactivated.")
    return user

def require_roles(*allowed_roles: str):
    """Dependency to enforce specific role permissions (RBAC)."""
    def checker(user: dict = Depends(get_required_user)):
        user_role = user.get("role")
        # System Admin always has bypass access to all areas
        if user_role == "admin" or user_role in allowed_roles:
            return user
        raise HTTPException(
            status_code=403, 
            detail=f"Access forbidden: requires role in {allowed_roles}. Current role: {user_role}"
        )
    return checker

@router.post("/register", response_model=TokenResponse)
def register_citizen(payload: CitizenRegisterRequest):
    """
    Public Citizen Registration Flow:
    - Strictly registers users with role 'citizen' (prevents admin spoofing)
    - Validates email, mobile, password strength, confirmation, and terms
    - Checks for duplicate email or mobile number
    - Securely hashes password before storing
    """
    now = datetime.now(timezone.utc)
    
    # 1. Validation checks
    if not payload.terms_accepted:
        raise HTTPException(status_code=400, detail="You must accept the Terms & Conditions to register.")
    
    if not payload.full_name or len(payload.full_name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Full Name is required (minimum 2 characters).")

    email = payload.email.strip().lower()
    email_regex = r"^[\w\.-]+@[\w\.-]+\.\w+$"
    if not re.match(email_regex, email):
        raise HTTPException(status_code=400, detail="Please provide a valid email address.")

    phone = payload.phone.strip()
    digits = re.sub(r"[^\d]", "", phone)
    if len(digits) < 10:
        raise HTTPException(status_code=400, detail="Please provide a valid 10-digit mobile number.")

    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters in length.")

    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Password and Confirm Password do not match.")

    if not payload.address or len(payload.address.strip()) < 3:
        raise HTTPException(status_code=400, detail="Address is required.")

    if not payload.city or len(payload.city.strip()) < 2:
        raise HTTPException(status_code=400, detail="City is required.")

    # 2. Duplicate Prevention
    existing_email = query_one("SELECT id FROM users WHERE LOWER(email) = ?", (email,))
    if existing_email:
        raise HTTPException(status_code=400, detail="An account with this email address already exists.")

    existing_phone = query_one("SELECT id FROM users WHERE phone = ? OR phone = ?", (phone, f"+91 {digits[-10:]}"))
    if existing_phone:
        raise HTTPException(status_code=400, detail="An account with this mobile number already exists.")

    # 3. Create Citizen Account
    new_user_id = f"user-{uuid.uuid4().hex[:10]}"
    pwd_hash = hash_password(payload.password)

    execute_commit("""
        INSERT INTO users (id, email, phone, password_hash, full_name, role, department_id, address, city, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, 'citizen', NULL, ?, ?, 1, ?)
    """, (
        new_user_id, email, phone, pwd_hash, payload.full_name.strip(),
        payload.address.strip(), payload.city.strip(), now.isoformat()
    ))

    # 4. Generate JWT
    token = create_access_token({
        "sub": new_user_id,
        "role": "citizen",
        "full_name": payload.full_name.strip(),
        "email": email,
        "department_id": None
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user_id,
            "full_name": payload.full_name.strip(),
            "email": email,
            "phone": phone,
            "role": "citizen",
            "department_id": None,
            "department_name": None,
            "address": payload.address.strip(),
            "city": payload.city.strip(),
            "is_active": True
        }
    }

@router.post("/login", response_model=TokenResponse)
def login(creds: UserLogin):
    """
    Authenticate user via email/phone and password (or simulated OTP '123456').
    Optionally validates expected_role to ensure appropriate portal access.
    """
    cleaned_input = creds.phone_or_email.strip()
    user = query_one(
        """
        SELECT u.*, d.name as department_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE LOWER(u.email) = LOWER(?) OR u.phone = ? OR u.phone = ?
        """, 
        (cleaned_input, cleaned_input, f"+91 {cleaned_input.lstrip('+91 ').strip()}")
    )
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email/mobile or password.")

    if not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Account is deactivated. Contact municipal administration.")

    # Role validation if expected_role is specified (e.g. logging into Officer portal)
    if creds.expected_role:
        target_role = creds.expected_role.lower()
        if user["role"] != target_role and user["role"] != "admin":
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied: This account has role '{user['role'].upper()}', not authorized for the {target_role.upper()} portal."
            )

    # Check OTP or Password
    if creds.otp:
        if creds.otp != "123456":
            raise HTTPException(status_code=401, detail="Invalid OTP entered.")
    elif creds.password:
        if not verify_password(creds.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Incorrect password entered.")
    else:
        raise HTTPException(status_code=400, detail="Password or OTP is required.")

    token = create_access_token({
        "sub": user["id"], 
        "role": user["role"], 
        "full_name": user["full_name"],
        "email": user["email"],
        "department_id": user["department_id"]
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
            "phone": user["phone"],
            "role": user["role"],
            "department_id": user["department_id"],
            "department_name": user.get("department_name"),
            "address": user.get("address"),
            "city": user.get("city"),
            "is_active": bool(user["is_active"])
        }
    }

@router.post("/switch-role", response_model=TokenResponse)
def switch_role_demo(req: RoleSwitchRequest):
    """
    Demo Evaluation Helper: Instantly authenticate as any of the 5 roles for live hackathon evaluation.
    Target roles: citizen, officer, department_admin, ert_responder, admin
    """
    user = query_one(
        """
        SELECT u.*, d.name as department_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.role = ? 
        ORDER BY u.id ASC LIMIT 1
        """, 
        (req.target_role,)
    )
    if not user:
        user = query_one("SELECT u.*, d.name as department_name FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.role = 'citizen' LIMIT 1")
    if not user:
        raise HTTPException(status_code=404, detail="Role user not found.")

    token = create_access_token({
        "sub": user["id"], 
        "role": user["role"], 
        "full_name": user["full_name"],
        "email": user["email"],
        "department_id": user["department_id"]
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "full_name": user["full_name"],
            "email": user["email"],
            "phone": user["phone"],
            "role": user["role"],
            "department_id": user["department_id"],
            "department_name": user.get("department_name"),
            "address": user.get("address"),
            "city": user.get("city"),
            "is_active": bool(user["is_active"])
        }
    }

@router.get("/me")
def get_profile(current_user: dict = Depends(get_required_user)):
    """Retrieve verified profile of authenticated user."""
    return current_user

