from fastapi import WebSocket
from typing import List, Dict, Any
import json
import asyncio

class ConnectionManager:
    """Manages real-time WebSocket subscriptions for CAD dispatchers and Citizens."""
    def __init__(self):
        self.cad_connections: List[WebSocket] = []
        self.complaint_connections: List[WebSocket] = []

    async def connect_cad(self, websocket: WebSocket):
        await websocket.accept()
        self.cad_connections.append(websocket)

    def disconnect_cad(self, websocket: WebSocket):
        if websocket in self.cad_connections:
            self.cad_connections.remove(websocket)

    async def connect_complaint(self, websocket: WebSocket):
        await websocket.accept()
        self.complaint_connections.append(websocket)

    def disconnect_complaint(self, websocket: WebSocket):
        if websocket in self.complaint_connections:
            self.complaint_connections.remove(websocket)

    async def broadcast_cad(self, event_type: str, data: Dict[str, Any]):
        """Broadcast emergency CAD alert or telemetry ping to all active dispatchers."""
        message = json.dumps({"event": event_type, "data": data})
        stale = []
        for connection in self.cad_connections:
            try:
                await connection.send_text(message)
            except Exception:
                stale.append(connection)
        for dead in stale:
            self.disconnect_cad(dead)

    async def broadcast_complaint(self, event_type: str, data: Dict[str, Any]):
        """Broadcast grievance status update or officer assignment."""
        message = json.dumps({"event": event_type, "data": data})
        stale = []
        for connection in self.complaint_connections:
            try:
                await connection.send_text(message)
            except Exception:
                stale.append(connection)
        for dead in stale:
            self.disconnect_complaint(dead)

manager = ConnectionManager()
