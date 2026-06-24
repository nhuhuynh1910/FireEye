import os
import jwt
import re
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from passlib.context import CryptContext
from services.db_service import get_connection, get_now

# Read JWT Secret Key from env or use a fallback.
# In production, this should be a strong, unique secret key configured in .env.
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fireeye_super_secret_key_123_change_me!")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


import time

# --- Password Hashing ---
def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def is_password_strong(password: str) -> tuple[bool, str]:
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter (A-Z)."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter (a-z)."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number (0-9)."
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character (e.g. !@#$%^&*)."
    return True, ""


# --- JWT Helper Functions ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = time.time() + expires_delta.total_seconds()
    else:
        expire = time.time() + (ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    to_encode.update({"exp": int(expire), "type": "access"})
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = time.time() + expires_delta.total_seconds()
    else:
        expire = time.time() + (REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600)
    to_encode.update({"exp": int(expire), "type": "refresh"})
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None  # Token expired
    except jwt.InvalidTokenError:
        return None  # Invalid token


# --- User CRUD SQLite Operations ---
def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (username.lower().strip(),))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_id(user_id: Any) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (int(user_id),))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def create_user(username: str, password: str, full_name: Optional[str], role: str) -> int:
    strong, msg = is_password_strong(password)
    if not strong:
        raise ValueError(msg)
    conn = get_connection()
    cursor = conn.cursor()
    hashed_pw = hash_password(password)
    cursor.execute("""
        INSERT INTO users (username, hashed_password, full_name, role, is_first_login, is_active, created_at)
        VALUES (?, ?, ?, ?, 1, 1, ?)
    """, (username.lower().strip(), hashed_pw, full_name, role.upper(), get_now()))
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    return user_id


def update_user(user_id: int, full_name: Optional[str], role: str, password: Optional[str] = None, is_active: Optional[bool] = None) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    
    is_active_val = 1 if is_active is None or is_active else 0
    
    if password and password.strip():
        strong, msg = is_password_strong(password)
        if not strong:
            raise ValueError(msg)
        hashed_pw = hash_password(password)
        cursor.execute("""
            UPDATE users
            SET full_name = ?, role = ?, hashed_password = ?, is_active = ?
            WHERE id = ?
        """, (full_name, role.upper(), hashed_pw, is_active_val, user_id))
    else:
        cursor.execute("""
            UPDATE users
            SET full_name = ?, role = ?, is_active = ?
            WHERE id = ?
        """, (full_name, role.upper(), is_active_val, user_id))
        
    conn.commit()
    affected = cursor.rowcount > 0
    conn.close()
    return affected


def delete_user(user_id: int) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    affected = cursor.rowcount > 0
    conn.close()
    return affected


def list_users() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, full_name, role, is_first_login, is_active, failed_login_attempts, locked_until, created_at FROM users ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def change_user_password(user_id: int, new_password: str) -> bool:
    strong, msg = is_password_strong(new_password)
    if not strong:
        raise ValueError(msg)
    conn = get_connection()
    cursor = conn.cursor()
    hashed_pw = hash_password(new_password)
    cursor.execute("""
        UPDATE users
        SET hashed_password = ?, is_first_login = 0
        WHERE id = ?
    """, (hashed_pw, user_id))
    conn.commit()
    affected = cursor.rowcount > 0
    conn.close()
    return affected


def increment_failed_login(user_id: int) -> tuple[int, Optional[str]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT failed_login_attempts FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    attempts = (row["failed_login_attempts"] if row else 0) + 1
    
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
