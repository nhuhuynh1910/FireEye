# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, status
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import Optional, List
from services.db_service import (
    get_all_users,
    get_user_by_username,
    insert_user,
    update_user,
    delete_user_db
)
from services.auth_service import hash_password, require_admin

router = APIRouter(
    prefix="/api/users",
    tags=["User Management"]
)

class UserCreateRequest(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = ""
    role: str # 'ADMIN' | 'STAFF'

class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = ""
    role: str # 'ADMIN' | 'STAFF'
    password: Optional[str] = None

@router.get("")
def list_users(admin_user: dict = Depends(require_admin)):
    users = get_all_users()
    # Ensure is_first_login is bool
    for u in users:
        u["is_first_login"] = bool(u["is_first_login"])
    return users

@router.post("")
def create_user(payload: UserCreateRequest, admin_user: dict = Depends(require_admin)):
    # Validate username uniqueness
    existing = get_user_by_username(payload.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên đăng nhập đã tồn tại trên hệ thống"
        )
    
    pwd_hash = hash_password(payload.password)
    user_id = insert_user(
        username=payload.username,
        password_hash=pwd_hash,
        full_name=payload.full_name,
        role=payload.role.upper()
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
    # Prevent self-demotion or self-modification of role if desired,
    # but the frontend prevents deleting yourself. Let's make sure role is upper
    role = payload.role.upper()
    
    pwd_hash = None
    if payload.password:
        pwd_hash = hash_password(payload.password)
        
    update_user(
        user_id=user_id,
        full_name=payload.full_name,
        role=role,
        password_hash=pwd_hash
    )
    
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
