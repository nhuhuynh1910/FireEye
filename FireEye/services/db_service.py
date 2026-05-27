import sqlite3
from pathlib import Path
from typing import Optional, List, Dict, Any

DB_DIR = Path("data")
DB_PATH = DB_DIR / "fireeye.db"

DB_DIR.mkdir(exist_ok=True)


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            source TEXT NOT NULL,
            risk_level TEXT,
            confidence REAL,
            message TEXT,
            snapshot_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()


def insert_event(
    event_type: str,
    source: str,
    risk_level: str = "LOW",
    confidence: Optional[float] = None,
    message: str = "",
    snapshot_path: Optional[str] = None
):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO events (
            event_type,
            source,
            risk_level,
            confidence,
            message,
            snapshot_path
        )
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        event_type,
        source,
        risk_level,
        confidence,
        message,
        snapshot_path
    ))

    conn.commit()
    event_id = cursor.lastrowid
    conn.close()

    return event_id


def get_events(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT *
        FROM events
        ORDER BY id DESC
        LIMIT ?
    """, (limit,))

    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]