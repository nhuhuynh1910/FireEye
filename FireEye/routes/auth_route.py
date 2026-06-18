# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from services.db_service import get_user_by_username, update_user_password, get_user_by_id
from services.auth_service import (
    verify_password,
    hash_password,
    create_access_token,
    create_refresh_token,
    decode_jwt,
    get_current_user
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
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác"
        )
    
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
    
    new_hash = hash_password(payload.new_password)
    update_user_password(current_user["id"], new_hash, is_first_login=0)
    return {"success": True, "message": "Đổi mật khẩu thành công"}
