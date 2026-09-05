from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List, Dict, Any
from app.models.schemas import SOSTriggerRequest, DispatchUnitRequest, UnitTelemetryUpdate, EmergencyUnitResponse
from app.core.database import query_one, query_all, execute_commit
from app.api.auth import get_current_user
from app.services.gis_service import sort_units_by_proximity
from app.services.notif_service import manager
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/api/v1/emergency", tags=["Emergency CAD"])

@router.get("/units")
def list_units():
    """List all emergency fleet response vehicles."""
    return query_all("SELECT * FROM emergency_units ORDER BY unit_callsign ASC")

@router.get("/cad/active")
def get_active_cad_incidents():
    """
    Retrieve active CAD queue for emergency dispatchers.
    Each incident is augmented with sorted nearest available units and ETA.
    """
    emergencies = query_all("""
        SELECT * FROM emergencies 
        WHERE status NOT IN ('CONTAINED', 'CLOSED')
        ORDER BY created_at DESC
    """)
    all_units = query_all("SELECT * FROM emergency_units WHERE status = 'AVAILABLE'")
    if not all_units:
        all_units = query_all("SELECT * FROM emergency_units")
    
    results = []
    for emg in emergencies:
        nearest = sort_units_by_proximity(emg["latitude"], emg["longitude"], all_units)
        
        # Check if already assigned
        dispatch = query_one("""
            SELECT ed.*, eu.unit_callsign, eu.unit_type, eu.status as unit_status, eu.current_lat, eu.current_lon, eu.last_ping_at
            FROM emergency_dispatches ed
            JOIN emergency_units eu ON ed.unit_id = eu.id
            WHERE ed.emergency_id = ? AND ed.cleared_at IS NULL
            LIMIT 1
        """, (emg["id"],))

        results.append({
            **emg,
            "assigned_unit": dispatch,
            "nearest_units": nearest[:4]
        })
        
    return results

@router.post("/sos")
async def trigger_emergency_sos(payload: SOSTriggerRequest, current_user: Optional[dict] = Depends(get_current_user)):
    """
    High-Velocity 1-Click SOS Panic Ingestion (< 500ms):
    1. Registers critical incident.
    2. Identifies nearest active units.
    3. Broadcasts immediate siren signal & incident payload to all CAD consoles.
    """
    now = datetime.now(timezone.utc)
    emg_id = f"emg-{uuid.uuid4().hex[:8]}"
    
    # Generate incident code
    cnt = query_one("SELECT COUNT(*) as count FROM emergencies")
    inc_code = f"SOS-2026-{(cnt['count'] if cnt else 0) + 1:04d}"
    
    citizen_id = current_user["id"] if current_user else "user-citizen"
    contact_phone = payload.contact_phone or (current_user.get("phone") if current_user else "+91 99999 11111")

    execute_commit("""
        INSERT INTO emergencies (
            id, incident_code, citizen_id, contact_phone, emergency_type, 
            priority, status, latitude, longitude, address_text, battery_level, created_at
        ) VALUES (?, ?, ?, ?, ?, 'P1_CRITICAL', 'DISPATCH_PENDING', ?, ?, ?, ?, ?)
    """, (
        emg_id, inc_code, citizen_id, contact_phone, payload.emergency_type,
        payload.latitude, payload.longitude, payload.address_text or "Live GPS SOS Beacon",
        payload.battery_level or 88, now.isoformat()
    ))

    # Query nearest available responders
    available_units = query_all("SELECT * FROM emergency_units WHERE status = 'AVAILABLE'")
    nearest = sort_units_by_proximity(payload.latitude, payload.longitude, available_units)

    alert_payload = {
        "id": emg_id,
        "incident_code": inc_code,
        "emergency_type": payload.emergency_type,
        "priority": "P1_CRITICAL",
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "contact_phone": contact_phone,
        "battery_level": payload.battery_level or 88,
        "nearest_unit": nearest[0]["unit_callsign"] if nearest else "None Nearby",
        "eta_minutes": nearest[0]["eta_minutes"] if nearest else None,
        "created_at": now.isoformat()
    }

    # High-priority broadcast: triggers red alert banner + audible siren on CAD consoles
    await manager.broadcast_cad("SOS_CRITICAL_ALERT", alert_payload)

    return {
        "status": "SOS_BROADCAST_SUCCESS",
        "incident_code": inc_code,
        "emergency_id": emg_id,
        "eta_minutes": nearest[0]["eta_minutes"] if nearest else 5.0,
        "message": "Emergency dispatch alert received. Nearest units alerted."
    }

@router.post("/cad/{emergency_id}/dispatch")
async def dispatch_unit(emergency_id: str, payload: DispatchUnitRequest, current_user: Optional[dict] = Depends(get_current_user)):
    """CAD Dispatcher orders unit to respond to emergency with RBAC check."""
    if current_user:
        role = current_user.get("role")
        if role not in ["ert_responder", "admin"]:
            raise HTTPException(status_code=403, detail="Access denied: Only emergency dispatchers can dispatch CAD response units.")

    now = datetime.now(timezone.utc)
    emg = query_one("SELECT * FROM emergencies WHERE id = ?", (emergency_id,))
    if not emg:
        raise HTTPException(status_code=404, detail="Emergency incident not found")

    unit = query_one("SELECT * FROM emergency_units WHERE id = ?", (payload.unit_id,))
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    # Record dispatch
    disp_id = f"disp-{uuid.uuid4().hex[:8]}"
    dispatcher_id = current_user["id"] if current_user else "user-ert"
    
    execute_commit("""
        INSERT INTO emergency_dispatches (id, emergency_id, unit_id, dispatched_by, dispatched_at, notes)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (disp_id, emergency_id, payload.unit_id, dispatcher_id, now.isoformat(), payload.notes or "CAD priority dispatch"))

    # Update states
    execute_commit("UPDATE emergencies SET status = 'UNIT_ASSIGNED' WHERE id = ?", (emergency_id,))
    execute_commit("UPDATE emergency_units SET status = 'EN_ROUTE' WHERE id = ?", (payload.unit_id,))

    # Log audit
    execute_commit("""
        INSERT INTO audit_logs (user_id, ip_address, action, entity_type, entity_id, diff_payload, created_at)
        VALUES (?, '127.0.0.1', 'EMERGENCY_DISPATCH_ISSUED', 'emergencies', ?, ?, ?)
    """, (
        dispatcher_id, emergency_id,
        f"Unit {unit['unit_callsign']} dispatched to incident {emg['incident_code']}",
        now.isoformat()
    ))

    # Broadcast update
    await manager.broadcast_cad("UNIT_DISPATCHED", {
        "emergency_id": emergency_id,
        "unit_id": payload.unit_id,
        "unit_callsign": unit["unit_callsign"],
        "status": "EN_ROUTE"
    })

    return {
        "message": f"Unit {unit['unit_callsign']} successfully dispatched to {emg['incident_code']}",
        "status": "UNIT_ASSIGNED"
    }

@router.patch("/cad/units/{unit_id}/location")
async def update_unit_telemetry(unit_id: str, payload: UnitTelemetryUpdate):
    """Ingest live GPS telematics ping from mobile unit or responder tracker."""
    now = datetime.now(timezone.utc)
    unit = query_one("SELECT * FROM emergency_units WHERE id = ?", (unit_id,))
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    status = payload.status or unit["status"]
    execute_commit("""
        UPDATE emergency_units 
        SET current_lat = ?, current_lon = ?, speed_kmh = ?, heading_deg = ?, status = ?, last_ping_at = ?
        WHERE id = ?
    """, (payload.latitude, payload.longitude, payload.speed_kmh or 0.0, payload.heading_deg or 0.0, status, now.isoformat(), unit_id))

    await manager.broadcast_cad("UNIT_TELEMETRY_UPDATE", {
        "unit_id": unit_id,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "speed_kmh": payload.speed_kmh,
        "status": status
    })

    return {"message": "Telemetry updated"}

@router.post("/cad/{emergency_id}/close")
async def close_emergency(emergency_id: str, current_user: Optional[dict] = Depends(get_current_user)):
    """Mark emergency contained, clear unit back to AVAILABLE, and submit debrief."""
    if current_user:
        role = current_user.get("role")
        if role not in ["ert_responder", "admin"]:
            raise HTTPException(status_code=403, detail="Access denied: Only emergency dispatchers can clear incidents.")

    now = datetime.now(timezone.utc)
    execute_commit("UPDATE emergencies SET status = 'CONTAINED' WHERE id = ?", (emergency_id,))
    
    # Free associated units
    dispatches = query_all("SELECT unit_id FROM emergency_dispatches WHERE emergency_id = ?", (emergency_id,))
    for d in dispatches:
        execute_commit("UPDATE emergency_units SET status = 'AVAILABLE' WHERE id = ?", (d["unit_id"],))
        execute_commit("UPDATE emergency_dispatches SET cleared_at = ? WHERE emergency_id = ? AND unit_id = ?", (now.isoformat(), emergency_id, d["unit_id"]))

    await manager.broadcast_cad("INCIDENT_CONTAINED", {"emergency_id": emergency_id})
    return {"message": "Emergency incident closed and units marked AVAILABLE"}

