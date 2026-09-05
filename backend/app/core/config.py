import os
from pathlib import Path
from typing import List

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BASE_DIR.parent
APP_DIR = BASE_DIR / "app"
DATABASE_DIR = ROOT_DIR / "database"
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True, parents=True)

# Simple custom .env parser to avoid external dependency issues
def load_dotenv(filepath: Path):
    if filepath.exists():
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip("'\"")
                    if k not in os.environ:
                        os.environ[k] = v

load_dotenv(ROOT_DIR / ".env")
load_dotenv(BASE_DIR / ".env")

# App Configuration
APP_NAME = os.getenv("APP_NAME", "Enterprise AI Civic Platform")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DEBUG = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATABASE_DIR / 'civic_platform.db'}")
DB_PATH = DATABASE_DIR / "civic_platform.db"

# Security & JWT
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-enterprise-civic-jwt-key-2026")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# CORS
cors_raw = os.getenv("CORS_ORIGINS", "*")
CORS_ORIGINS: List[str] = [orig.strip() for orig in cors_raw.split(",") if orig.strip()] if cors_raw != "*" else ["*"]

# External AI Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Roles Definition
ROLE_CITIZEN = "citizen"
ROLE_OFFICER = "officer"
ROLE_DEPT_ADMIN = "department_admin"
ROLE_ERT = "ert_responder"
ROLE_ADMIN = "admin"

ALL_ROLES = [ROLE_CITIZEN, ROLE_OFFICER, ROLE_DEPT_ADMIN, ROLE_ERT, ROLE_ADMIN]
