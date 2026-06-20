# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from datetime import datetime
from services.db_service import (
    get_user_by_username, 
    update_user_password, 
    get_user_by_id,
    increment_failed_login,
    reset_failed_login
)
from services.auth_service import (
    verify_password,
    hash_password,
    create_access_token,
    create_refresh_token,
    decode_jwt,
    get_current_user,
    is_password_strong
)

router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

class LoginRequest(BaseModel):
    username: str
    password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@router.post("/login")
def login(payload: LoginRequest, response: Response):
    user = get_user_by_username(payload.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác"
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
    if not verify_password(payload.password, user["password_hash"]):
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
        
    access_token = create_access_token(user["id"], user["role"])
    refresh_token = create_refresh_token(user["id"])
    
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
        "user": {
            "id": user["id"],
            "username": user["username"],
            "full_name": user["full_name"],
            "role": user["role"],
            "is_first_login": bool(user["is_first_login"])
        }
    }

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return {"success": True, "message": "Logged out successfully"}

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "username": current_user["username"],
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
