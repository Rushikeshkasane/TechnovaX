from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.notif_service import manager
import asyncio
import json

router = APIRouter(tags=["Real-Time WebSockets"])

@router.websocket("/api/v1/ws/cad")
async def cad_websocket_endpoint(websocket: WebSocket):
    """Real-time bidirectional CAD channel for dispatchers and responders."""
    await manager.connect_cad(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Respond to client ping or telemetry push
            try:
                parsed = json.loads(data)
                if parsed.get("action") == "PING":
                    await websocket.send_text(json.dumps({"event": "PONG"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect_cad(websocket)

@router.websocket("/api/v1/ws/complaints")
async def complaints_websocket_endpoint(websocket: WebSocket):
    """Real-time channel for citizen ticket tracking and officer dispatch alerts."""
    await manager.connect_complaint(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
                if parsed.get("action") == "PING":
                    await websocket.send_text(json.dumps({"event": "PONG"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect_complaint(websocket)
