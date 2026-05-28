from fastapi import APIRouter, UploadFile, File, Form
from pathlib import Path
import shutil

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


@router.post("/register")
def register_face(
    name: str = Form(...),
    role: str = Form("User"),
    image: UploadFile = File(...)
):
    file_path = UPLOAD_DIR / image.filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    result = register_face_from_image(
        name=name,
        role=role,
        image_path=str(file_path)
    )

    return result


@router.post("/match")
def match_face(
    image: UploadFile = File(...)
):
    file_path = UPLOAD_DIR / image.filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    result = match_face_from_image(
        image_path=str(file_path)
    )

    return result


@router.get("/match-camera")
def match_camera_face():
    return match_face_from_dahua()


@router.get("/people")
def get_people():
    return {
        "success": True,
        "data": list_people()
    }
