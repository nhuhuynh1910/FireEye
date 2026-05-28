from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pathlib import Path
import shutil
import uuid

from services.face_service import (
    register_face_from_image,
    match_face_from_image,
    match_face_from_dahua,
    list_people
)

router = APIRouter(
    prefix="/api/faces",
    tags=["Face Matching"]
)

UPLOAD_DIR = Path("uploads/faces")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}


@router.post("/register")
def register_face(
    name: str = Form(...),
    role: str = Form("User"),
    image: UploadFile = File(...)
):
    ext = Path(image.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận các định dạng ảnh (.jpg, .jpeg, .png)")

    # Sử dụng tên file ngẫu nhiên để chống lỗi Path Traversal
    safe_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / safe_filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

        result = register_face_from_image(
            name=name,
            role=role,
            image_path=str(file_path)
        )
        return result
    finally:
        # Dọn dẹp file tạm tránh rò rỉ dung lượng đĩa
        if file_path.exists():
            file_path.unlink()


@router.post("/match")
def match_face(
    image: UploadFile = File(...)
):
    ext = Path(image.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận các định dạng ảnh (.jpg, .jpeg, .png)")

    # Sử dụng tên file ngẫu nhiên để chống lỗi Path Traversal
    safe_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / safe_filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

        result = match_face_from_image(
            image_path=str(file_path)
        )
        return result
    finally:
        # Dọn dẹp file tạm tránh rò rỉ dung lượng đĩa
        if file_path.exists():
            file_path.unlink()


@router.get("/match-camera")
def match_camera_face():
    return match_face_from_dahua()


@router.get("/people")
def get_people():
    return {
        "success": True,
        "data": list_people()
    }
