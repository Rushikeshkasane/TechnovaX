from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.exceptions import RequestValidationError
from pathlib import Path
from app.core.config import (
    UPLOAD_DIR, APP_NAME, ENVIRONMENT, DEBUG, CORS_ORIGINS, ALL_ROLES
)
from app.core.database import init_db, check_db_connection
from app.core.logging_config import RequestLoggingMiddleware, logger
from app.core.exceptions import (
    AppException, app_exception_handler, http_exception_handler, 
    validation_exception_handler, generic_exception_handler
)
from app.api import auth, complaints, emergency, analytics, admin, ai, websockets
import os

app = FastAPI(
    title="Enterprise AI Service Desk, Public-Grievance & Emergency Response API",
    description="Unified civic governance and high-velocity CAD dispatch platform connecting Citizens, AI, Departments, Officers, Emergency Teams, and Administration.",
    version="1.0.0"
)

# 1. Register Logging Middleware
app.add_middleware(RequestLoggingMiddleware)

# 2. Register Global Exception Handlers for Structured Errors
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# 3. Enable CORS for frontend Vite / React client
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Static media storage serving for photo uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# 5. Mount API Routers
app.include_router(auth.router)
app.include_router(complaints.router)
app.include_router(emergency.router)
app.include_router(analytics.router)
app.include_router(admin.router)
app.include_router(ai.router)
app.include_router(websockets.router)

@app.on_event("startup")
def startup_event():
    """Ensure database tables exist on server startup."""
    init_db()
    db_status = check_db_connection()
    logger.info(f"[APP] {APP_NAME} started successfully in {ENVIRONMENT} mode.")
    logger.info(f"[DB] Engine: {db_status['engine']} (Tables: {db_status.get('tables_initialized', 0)})")

@app.get("/api/v1/health")
def health_check():
    """Healthcheck endpoint reporting backend runtime and database connectivity."""
    db_status = check_db_connection()
    is_healthy = db_status.get("connected", False)
    return {
        "status": "HEALTHY" if is_healthy else "DEGRADED",
        "app_name": APP_NAME,
        "environment": ENVIRONMENT,
        "version": "1.0.0",
        "database": db_status
    }

@app.get("/api/v1/system-info")
def system_info():
    """Public system configuration and supported roles."""
    return {
        "app_name": APP_NAME,
        "environment": ENVIRONMENT,
        "supported_roles": ALL_ROLES,
        "api_version": "v1",
        "realtime_websockets_enabled": True
    }

# 6. Serve Frontend SPA from dist if built
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("uploads") or full_path.startswith("docs") or full_path.startswith("openapi"):
            raise HTTPException(status_code=404, detail="Resource Not Found")
        target_file = FRONTEND_DIST / full_path
        if target_file.exists() and target_file.is_file():
            return FileResponse(target_file)
        return FileResponse(FRONTEND_DIST / "index.html")
