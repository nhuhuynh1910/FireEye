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

    # Enable WAL mode for SQLite to optimize writes and protect storage life
    cursor.execute("PRAGMA journal_mode=WAL;")

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

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            role TEXT NOT NULL,
            is_first_login INTEGER DEFAULT 1,
            is_active INTEGER DEFAULT 1,
            failed_login_attempts INTEGER DEFAULT 0,
            locked_until TEXT,
            created_at TEXT
        )
    """)

    # Bổ sung các cột mới cho bảng users (Safety-Critical fields)
    for col, col_type in [
        ("phone_number", "TEXT"), 
        ("fcm_token", "TEXT"), 
        ("face_profile_path", "TEXT"),
        ("is_active", "INTEGER DEFAULT 1"),
        ("failed_login_attempts", "INTEGER DEFAULT 0"),
        ("locked_until", "TEXT")
    ]:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col} {col_type}")
        except sqlite3.OperationalError:
            pass # Cột đã tồn tại

    # Tạo bảng phân quyền quản lý theo Zone
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS zone_authorizations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            zone_id INTEGER NOT NULL,
            assigned_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, zone_id)
        )
    """)

    # Tạo bảng Audit Logs ghi nhận hoạt động phần cứng
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            target_device TEXT,
            details TEXT,
            created_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        )
    """)

    # Tạo bảng lưu trạng thái phiên biểu quyết tạm thời để phòng chống sập nguồn
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS temporary_sessions (
            session_token TEXT PRIMARY KEY,
            zone_id INTEGER NOT NULL,
            initiator_id INTEGER NOT NULL,
            initiator_name TEXT NOT NULL,
            target_action TEXT NOT NULL,
            votes_approve INTEGER DEFAULT 1,
            votes_reject INTEGER DEFAULT 0,
            voters_voted_json TEXT NOT NULL,
            threshold INTEGER NOT NULL,
            expires_at REAL NOT NULL
        )
    """)

    # Tạo bảng lưu phiên đăng nhập của thiết bị
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_id TEXT UNIQUE NOT NULL,
            phone_number TEXT,
            device_name TEXT,
            ip_address TEXT,
            last_active TEXT,
            expires_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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


def mark_all_notifications_as_read():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE events
        SET is_read = 1
        WHERE is_read = 0
    """)

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


def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_all_users() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, full_name, role, phone_number, fcm_token, face_profile_path, is_first_login, is_active, created_at FROM users ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def insert_user(
    username: str,
    password_hash: str,
    full_name: str,
    role: str,
    phone_number: Optional[str] = "",
    fcm_token: Optional[str] = "",
    face_profile_path: Optional[str] = ""
) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO users (username, password_hash, full_name, role, phone_number, fcm_token, face_profile_path, is_first_login, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    """, (username, password_hash, full_name, role, phone_number, fcm_token, face_profile_path, get_now()))
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    if user_id is None:
        raise ValueError("Failed to insert user, row ID was not returned.")
    return user_id


def update_user(
    user_id: int,
    full_name: str,
    role: str,
    password_hash: Optional[str] = None,
    phone_number: Optional[str] = None,
    fcm_token: Optional[str] = None,
    face_profile_path: Optional[str] = None
) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    
    # Lấy thông tin user hiện tại để giữ lại các trường không cập nhật
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        return False
        
    current_phone = phone_number if phone_number is not None else existing["phone_number"]
    current_fcm = fcm_token if fcm_token is not None else existing["fcm_token"]
    current_face = face_profile_path if face_profile_path is not None else existing["face_profile_path"]

    if password_hash:
        cursor.execute("""
            UPDATE users
            SET full_name = ?, role = ?, password_hash = ?, phone_number = ?, fcm_token = ?, face_profile_path = ?, is_first_login = 1
            WHERE id = ?
        """, (full_name, role, password_hash, current_phone, current_fcm, current_face, user_id))
    else:
        cursor.execute("""
            UPDATE users
            SET full_name = ?, role = ?, phone_number = ?, fcm_token = ?, face_profile_path = ?
            WHERE id = ?
        """, (full_name, role, current_phone, current_fcm, current_face, user_id))
    conn.commit()
    conn.close()
    return True


def update_user_password(user_id: int, password_hash: str, is_first_login: int = 0) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE users
        SET password_hash = ?, is_first_login = ?
        WHERE id = ?
    """, (password_hash, is_first_login, user_id))
    conn.commit()
    conn.close()
    return True


def delete_user_db(user_id: int) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return True


def create_default_admin_if_not_exists():
    from services.auth_service import hash_password
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Seed OWNER (admin)
    cursor.execute("SELECT COUNT(*) as count FROM users WHERE username = 'admin'")
    if cursor.fetchone()["count"] == 0:
        admin_hash = hash_password("adminpassword")
        cursor.execute("""
            INSERT INTO users (username, password_hash, full_name, role, phone_number, fcm_token, face_profile_path, is_active, is_first_login, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
        """, ("admin", admin_hash, "System Administrator (Owner)", "OWNER", "+84999999999", "", "", get_now()))
        conn.commit()
        print("Default Owner user seeded successfully!")
        
    # 2. Seed ADMIN (admin1)
    cursor.execute("SELECT COUNT(*) as count FROM users WHERE username = 'admin1'")
    if cursor.fetchone()["count"] == 0:
        admin1_hash = hash_password("adminpassword123")
        cursor.execute("""
            INSERT INTO users (username, password_hash, full_name, role, phone_number, fcm_token, face_profile_path, is_active, is_first_login, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
        """, ("admin1", admin1_hash, "Zone Manager (Admin)", "ADMIN", "+84911111111", "", "", get_now()))
        conn.commit()
        print("Default Admin user seeded successfully!")
        
    # 3. Seed STAFF (staff1)
    cursor.execute("SELECT COUNT(*) as count FROM users WHERE username = 'staff1'")
    if cursor.fetchone()["count"] == 0:
        staff1_hash = hash_password("staffpassword123")
        cursor.execute("""
            INSERT INTO users (username, password_hash, full_name, role, phone_number, fcm_token, face_profile_path, is_active, is_first_login, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
        """, ("staff1", staff1_hash, "Duty Operator (Staff)", "STAFF", "+84922222222", "", "", get_now()))
        conn.commit()
        print("Default Staff user seeded successfully!")
        
    conn.close()


def update_user_status_db(user_id: int, is_active: int) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET is_active = ? WHERE id = ?", (is_active, user_id))
    conn.commit()
    conn.close()
    return True


def insert_audit_log(user_id: Optional[int], action: str, target_device: Optional[str] = None, details: Optional[str] = None):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO audit_logs (user_id, action, target_device, details, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (user_id, action, target_device, details, get_now()))
    conn.commit()
    conn.close()


def get_audit_logs(limit: int = 100) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT audit_logs.*, users.username, users.full_name
        FROM audit_logs
        LEFT JOIN users ON users.id = audit_logs.user_id
        ORDER BY audit_logs.id DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_zone_authorizations(user_id: int) -> List[int]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT zone_id FROM zone_authorizations WHERE user_id = ?", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return [row["zone_id"] for row in rows]


def insert_zone_authorization(user_id: int, zone_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT OR IGNORE INTO zone_authorizations (user_id, zone_id, assigned_at)
            VALUES (?, ?, ?)
        """, (user_id, zone_id, get_now()))
        conn.commit()
    finally:
        conn.close()


def remove_zone_authorization(user_id: int, zone_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM zone_authorizations WHERE user_id = ? AND zone_id = ?", (user_id, zone_id))
    conn.commit()
    conn.close()


# --- PHẦN HỒI PHỤC PHIÊN VỚI DATABASE (FAULT TOLERANCE) ---
def save_temporary_session(session: dict):
    conn = get_connection()
    cursor = conn.cursor()
    voters_json = json.dumps(session.get("voters_voted", []))
    cursor.execute("""
        INSERT OR REPLACE INTO temporary_sessions (
            session_token, zone_id, initiator_id, initiator_name, target_action,
            votes_approve, votes_reject, voters_voted_json, threshold, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        session["session_token"],
        session["zone_id"],
        session["initiator_id"],
        session["initiator_name"],
        session["target_action"],
        session["votes_approve"],
        session["votes_reject"],
        voters_json,
        session["threshold"],
        session["expires_at"]
    ))
    conn.commit()
    conn.close()


def delete_temporary_session(session_token: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM temporary_sessions WHERE session_token = ?", (session_token,))
    conn.commit()
    conn.close()


def get_all_temporary_sessions() -> List[dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM temporary_sessions")
    rows = cursor.fetchall()
    conn.close()
    
    sessions = []
    for row in rows:
        session = dict(row)
        try:
            session["voters_voted"] = json.loads(session["voters_voted_json"])
        except Exception:
            session["voters_voted"] = []
        sessions.append(session)
    return sessions


def increment_failed_login(user_id: int) -> tuple[int, Optional[str]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT failed_login_attempts FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    attempts = (row["failed_login_attempts"] if row and row["failed_login_attempts"] is not None else 0) + 1
    
    locked_until_str = None
    if attempts >= 5:
        locked_time = datetime.now() + timedelta(minutes=15)
        locked_until_str = locked_time.strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
            UPDATE users 
            SET failed_login_attempts = ?, locked_until = ? 
            WHERE id = ?
        """, (attempts, locked_until_str, user_id))
    else:
        cursor.execute("""
            UPDATE users 
            SET failed_login_attempts = ? 
            WHERE id = ?
        """, (attempts, user_id))
        
    conn.commit()
    conn.close()
    return attempts, locked_until_str


def reset_failed_login(user_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE users 
        SET failed_login_attempts = 0, locked_until = NULL 
        WHERE id = ?
    """, (user_id,))
    conn.commit()
    conn.close()


def get_user_by_phone(phone_number: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE phone_number = ?", (phone_number,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def insert_user_session(
    user_id: int,
    token_id: str,
    phone_number: str,
    device_name: Optional[str],
    ip_address: Optional[str],
    expires_at: str
) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO user_sessions (user_id, token_id, phone_number, device_name, ip_address, last_active, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (user_id, token_id, phone_number, device_name, ip_address, get_now(), expires_at))
    conn.commit()
    session_id = cursor.lastrowid
    conn.close()
    return session_id


def get_active_sessions_count(user_id: int) -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT COUNT(*) as count 
        FROM user_sessions 
        WHERE user_id = ? AND expires_at > ?
    """, (user_id, get_now()))
    row = cursor.fetchone()
    conn.close()
    return row["count"] if row else 0


def delete_oldest_session(user_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id 
        FROM user_sessions 
        WHERE user_id = ? 
        ORDER BY last_active ASC 
        LIMIT 1
    """, (user_id,))
    row = cursor.fetchone()
    if row:
        cursor.execute("DELETE FROM user_sessions WHERE id = ?", (row["id"],))
        conn.commit()
    conn.close()


def delete_user_session(token_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM user_sessions WHERE token_id = ?", (token_id,))
    conn.commit()
    rowcount = cursor.rowcount
    conn.close()
    return rowcount > 0


def is_session_valid(token_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT expires_at 
        FROM user_sessions 
        WHERE token_id = ?
    """, (token_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return False
        
    expires_at_str = row["expires_at"]
    try:
        expires_at_dt = datetime.strptime(expires_at_str, "%Y-%m-%d %H:%M:%S")
        return datetime.now() < expires_at_dt
    except Exception:
        return False