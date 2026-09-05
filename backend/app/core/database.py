import sqlite3
import os
from contextlib import contextmanager
from pathlib import Path
from typing import Generator, Any, Dict, List, Optional
from app.core.config import DB_PATH, DATABASE_DIR

SCHEMA_FILE = DATABASE_DIR / "schema.sql"

def dict_factory(cursor: sqlite3.Cursor, row: tuple) -> Dict[str, Any]:
    """Convert SQLite row to dictionary."""
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

def get_connection() -> sqlite3.Connection:
    """Obtain a new SQLite database connection with row factory and foreign keys enabled."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = dict_factory
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    """Context manager for safe database transactions."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    """Initialize database tables using schema.sql if not yet initialized."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='complaints';")
        if not cursor.fetchone():
            if SCHEMA_FILE.exists():
                with open(SCHEMA_FILE, "r", encoding="utf-8") as f:
                    schema_sql = f.read()
                conn.executescript(schema_sql)
                print(f"[DB] Initialized database schema from {SCHEMA_FILE}")
            else:
                print(f"[DB] Warning: Schema file not found at {SCHEMA_FILE}")
        else:
            # Migration check: ensure address & city columns exist in users table
            try:
                cursor.execute("PRAGMA table_info(users);")
                cols = [row["name"] for row in cursor.fetchall()]
                if "address" not in cols:
                    cursor.execute("ALTER TABLE users ADD COLUMN address VARCHAR(255);")
                if "city" not in cols:
                    cursor.execute("ALTER TABLE users ADD COLUMN city VARCHAR(100);")
            except Exception as e:
                print(f"[DB] Column check error: {e}")


def check_db_connection() -> Dict[str, Any]:
    """Verify database connectivity and check schema initialization."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT sqlite_version() as version;")
            ver = cursor.fetchone()
            cursor.execute("SELECT COUNT(*) as table_count FROM sqlite_master WHERE type='table';")
            tbl = cursor.fetchone()
            return {
                "connected": True,
                "engine": "SQLite",
                "version": ver.get("version") if ver else "unknown",
                "tables_initialized": tbl.get("table_count", 0) if tbl else 0,
                "database_path": str(DB_PATH)
            }
    except Exception as e:
        return {
            "connected": False,
            "error": str(e)
        }

def query_one(sql: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
    """Execute query and return single row dict or None."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        return cursor.fetchone()

def query_all(sql: str, params: tuple = ()) -> List[Dict[str, Any]]:
    """Execute query and return all matching rows as dict list."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        return cursor.fetchall()

def execute_commit(sql: str, params: tuple = ()) -> int:
    """Execute modifying SQL query and return lastrowid or affected row count."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        conn.commit()
        return cursor.lastrowid
