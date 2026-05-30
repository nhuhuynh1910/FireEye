import sqlite3
import json
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

DB_DIR = Path("data")
DB_PATH = DB_DIR / "fireeye.db"

DB_DIR.mkdir(exist_ok=True)


def get_now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


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
            is_read INTEGER DEFAULT 0,
            created_at TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS people (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            role TEXT,
            avatar_path TEXT,
            created_at TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS face_embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            person_id INTEGER NOT NULL,
            embedding TEXT NOT NULL,
            image_path TEXT,
            created_at TEXT,
            FOREIGN KEY (person_id) REFERENCES people(id)
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
            snapshot_path,
            is_read,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        event_type,
        source,
        risk_level,
        confidence,
        message,
        snapshot_path,
        0,
        get_now()
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


def insert_person(
    name: str,
    role: str = "",
    avatar_path: str = ""
):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO people (
            name,
            role,
            avatar_path,
            created_at
        )
        VALUES (?, ?, ?, ?)
    """, (
        name,
        role,
        avatar_path,
        get_now()
    ))

    conn.commit()
    person_id = cursor.lastrowid
    conn.close()

    return person_id


def insert_face_embedding(
    person_id: int,
    embedding,
    image_path: str = ""
):
    conn = get_connection()
    cursor = conn.cursor()

    embedding_json = json.dumps(
        embedding.tolist()
    )

    cursor.execute("""
        INSERT INTO face_embeddings (
            person_id,
            embedding,
            image_path,
            created_at
        )
        VALUES (?, ?, ?, ?)
    """, (
        person_id,
        embedding_json,
        image_path,
        get_now()
    ))

    conn.commit()
    embedding_id = cursor.lastrowid
    conn.close()

    return embedding_id


def get_all_face_embeddings():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            face_embeddings.id,
            face_embeddings.person_id,
            people.name,
            people.role,
            face_embeddings.embedding,
            face_embeddings.image_path,
            face_embeddings.created_at
        FROM face_embeddings
        JOIN people
        ON people.id = face_embeddings.person_id
        ORDER BY face_embeddings.id DESC
    """)

    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


def get_people():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT *
        FROM people
        ORDER BY id DESC
    """)

    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


def get_notifications(limit: int = 20):
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


def get_unread_notification_count():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT COUNT(*) as total
        FROM events
        WHERE is_read = 0
    """)

    row = cursor.fetchone()
    conn.close()

    return row["total"]


def mark_notification_as_read(event_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE events
        SET is_read = 1
        WHERE id = ?
    """, (event_id,))

    conn.commit()
    conn.close()

    return True


def cleanup_old_events(days: int = 7):
    conn = get_connection()
    cursor = conn.cursor()

    cutoff = (
        datetime.now() - timedelta(days=days)
    ).strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("""
        DELETE FROM events
        WHERE created_at < ?
    """, (cutoff,))

    deleted_count = cursor.rowcount

    conn.commit()
    conn.close()

    return deleted_count