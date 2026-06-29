# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from datetime import datetime, timedelta
import uuid
import hmac
from typing import Optional
from config.settings import SYSTEM_SECRET_KEY
from services.db_service import (
    get_user_by_username, 
    update_user_password, 
    get_user_by_id,
    increment_failed_login,
    reset_failed_login,
    get_user_by_phone,
    insert_user_session,
    get_active_sessions_count,
    delete_oldest_session,
    delete_user_session
)
from services.auth_service import (
    verify_password,
    hash_password,
    create_access_token,
    create_refresh_token,
    decode_jwt,
    get_current_user,
    is_password_strong,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

class LoginRequest(BaseModel):
    phone_number: str
    secret_key: str
    system_secret_key: str
    device_name: Optional[str] = "Unknown Device"

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@router.post("/login")
def login(payload: LoginRequest, request: Request, response: Response):
    # Verify System Secret Key first
    if not hmac.compare_digest(payload.system_secret_key, SYSTEM_SECRET_KEY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mã khóa hệ thống không chính xác"
        )

    user = get_user_by_phone(payload.phone_number)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Số điện thoại hoặc mã khóa không chính xác"
        )
    
    # 1. Check if account is deactivated
    if not user.get("is_active", 1):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị quản trị viên vô hiệu hóa"
        )
        
    # 2. Check if account is locked
    locked_until_str = user.get("locked_until")
    if locked_until_str:
        try:
            locked_until_dt = datetime.strptime(locked_until_str, "%Y-%m-%d %H:%M:%S")
            if datetime.now() < locked_until_dt:
                diff = int((locked_until_dt - datetime.now()).total_seconds())
                mins = diff // 60
                secs = diff % 60
                time_str = f"{mins}m {secs}s" if mins > 0 else f"{secs}s"
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Tài khoản bị tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau {time_str}."
                )
        except HTTPException:
            raise
        except Exception:
            pass
            
    # 3. Verify credentials
    if not verify_password(payload.secret_key, user["password_hash"]):
        attempts, locked_time = increment_failed_login(user["id"])
        if locked_time:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản đã bị tạm khóa 15 phút do nhập sai mật khẩu quá 5 lần."
            )
        else:
            remaining = 5 - attempts
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Mật khẩu không chính xác. Bạn còn {remaining} lần thử."
            )
            
    # Reset lock state on successful login
    if user.get("failed_login_attempts", 0) > 0 or user.get("locked_until"):
        reset_failed_login(user["id"])
        
    # Max active sessions limit: default is 3
    MAX_SESSIONS = 3
    active_count = get_active_sessions_count(user["id"])
    if active_count >= MAX_SESSIONS:
        delete_oldest_session(user["id"])
        
    jti = uuid.uuid4().hex
    expires_at = (datetime.now() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)).strftime("%Y-%m-%d %H:%M:%S")
    ip_address = request.client.host if request.client else "Unknown IP"
    
    # Save the session to SQLite
    insert_user_session(
        user_id=user["id"],
        token_id=jti,
        phone_number=user["phone_number"],
        device_name=payload.device_name,
        ip_address=ip_address,
        expires_at=expires_at
    )
    
    access_token = create_access_token(user["id"], user["role"], jti)
    refresh_token = create_refresh_token(user["id"], jti)
    
    # Set cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/"
    )
    
    return {
        "success": True,
        "token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "phone_number": user["phone_number"],
            "full_name": user["full_name"],
            "role": user["role"],
            "is_first_login": bool(user["is_first_login"])
        }
    }

@router.post("/logout")
def logout(response: Response, current_user: dict = Depends(get_current_user)):
    jti = current_user.get("jti")
    if jti:
        delete_user_session(jti)
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return {"success": True, "message": "Logged out successfully"}

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "phone_number": current_user.get("phone_number"),
        "full_name": current_user["full_name"],
        "role": current_user["role"],
        "is_first_login": bool(current_user["is_first_login"])
    }

@router.post("/refresh")
def refresh(request: Request, response: Response):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token"
        )
    try:
        payload = decode_jwt(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        user_id = int(payload.get("sub"))
        user = get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        access_token = create_access_token(user["id"], user["role"])
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            samesite="lax",
            secure=False,
            path="/"
        )
        return {"success": True}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

@router.post("/change-password")
def change_password(payload: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    if not verify_password(payload.old_password, current_user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không đúng"
        )
    
    strong, msg = is_password_strong(payload.new_password)
    if not strong:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg
        )
    
    new_hash = hash_password(payload.new_password)
    update_user_password(current_user["id"], new_hash, is_first_login=0)
    return {"success": True, "message": "Đổi mật khẩu thành công"}
