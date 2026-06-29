# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import Optional, List
import hmac
from config.settings import SYSTEM_SECRET_KEY
from services.db_service import (
    get_all_users,
    get_user_by_username,
    insert_user,
    update_user,
    delete_user_db,
    update_user_status_db,
    get_user_by_phone
)
from services.auth_service import hash_password, require_admin, is_password_strong

router = APIRouter(
    prefix="/api/users",
    tags=["User Management"]
)

class UserCreateRequest(BaseModel):
    username: str
    password: str
    phone_number: str
    system_secret_key: str
    full_name: Optional[str] = ""
    role: str # 'ADMIN' | 'STAFF' | 'OWNER'

class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = ""
    role: str # 'ADMIN' | 'STAFF' | 'OWNER'
    password: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: Optional[bool] = True

@router.get("")
def list_users(admin_user: dict = Depends(require_admin)):
    users = get_all_users()
    # Ensure is_first_login is bool
    for u in users:
        u["is_first_login"] = bool(u["is_first_login"])
        u["is_active"] = bool(u.get("is_active", 1))
    return users

@router.post("")
def create_user(payload: UserCreateRequest, admin_user: dict = Depends(require_admin)):
    # Validate System Secret Key
    if not hmac.compare_digest(payload.system_secret_key, SYSTEM_SECRET_KEY):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mã khóa hệ thống không chính xác"
        )

    # Validate username uniqueness
    existing = get_user_by_username(payload.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên đăng nhập đã tồn tại trên hệ thống"
        )
    # Validate phone number uniqueness
    existing_phone = get_user_by_phone(payload.phone_number)
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Số điện thoại đã tồn tại trên hệ thống"
        )
    
    strong, msg = is_password_strong(payload.password)
    if not strong:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg
        )
        
    pwd_hash = hash_password(payload.password)
    user_id = insert_user(
        username=payload.username,
        password_hash=pwd_hash,
        full_name=payload.full_name,
        role=payload.role.upper(),
        phone_number=payload.phone_number
    )
    
    return {
        "success": True,
        "message": f"Tạo người dùng {payload.username} thành công",
        "user_id": user_id
    }

@router.put("/{user_id}")
def update_user_details(
    user_id: int, 
    payload: UserUpdateRequest, 
    admin_user: dict = Depends(require_admin)
):
    role = payload.role.upper()
    
    pwd_hash = None
    if payload.password:
        strong, msg = is_password_strong(payload.password)
        if not strong:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=msg
            )
        pwd_hash = hash_password(payload.password)
        
    update_user(
        user_id=user_id,
        full_name=payload.full_name,
        role=role,
        password_hash=pwd_hash,
        phone_number=payload.phone_number
    )
    
    # Update active status
    is_active_val = 1 if payload.is_active is None or payload.is_active else 0
    update_user_status_db(user_id, is_active_val)
    
    return {
        "success": True,
        "message": "Cập nhật thông tin người dùng thành công"
    }

@router.delete("/{user_id}")
def delete_user(user_id: int, admin_user: dict = Depends(require_admin)):
    if user_id == admin_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn không thể tự xóa tài khoản quản trị của chính mình"
        )
        
    delete_user_db(user_id)
    return {
        "success": True,
        "message": "Xóa tài khoản thành công"
    }
