from fastapi import APIRouter, UploadFile, File, Form
from pathlib import Path
import shutil

from services.face_service import (
    register_face_from_image,
    match_face_from_image,
    match_face_from_dahua,
    list_people
)

from services.realtime_face_worker import (
    start_face_worker,
    stop_face_worker,
    get_face_worker_status
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


@router.post("/watch/start")
def start_face_watch():

    return start_face_worker()


@router.post("/watch/stop")
def stop_face_watch():

    return stop_face_worker()


@router.get("/watch/status")
def face_watch_status():

    return get_face_worker_status()


@router.get("/people")
def get_people():

    return {
        "success": True,
        "data": list_people()
    }