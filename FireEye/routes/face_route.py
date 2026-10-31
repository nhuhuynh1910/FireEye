from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from pathlib import Path
import shutil
import uuid

from services.face_service import (
    register_face_from_image,
    register_face_from_dahua,
    match_face_from_image,
    match_face_from_dahua,
    list_people,
    delete_person,
    add_face_sample_to_person
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
    consent: bool = Form(True),
    group_tag: str = Form("FAMILY"),
    angle_type: str = Form("FRONTAL"),
    image: UploadFile = File(...)
):
    filename = f"{uuid.uuid4().hex}_{Path(image.filename).name}" if image.filename else f"{uuid.uuid4().hex}.jpg"
    file_path = UPLOAD_DIR / filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    result = register_face_from_image(
        name=name,
        role=role,
        image_path=str(file_path),
        consent=consent,
        group_tag=group_tag,
        angle_type=angle_type
    )

    return result


@router.post("/register-camera")
def register_camera_face(
    name: str = Form(...),
    role: str = Form("User"),
    consent: bool = Form(True),
    group_tag: str = Form("FAMILY"),
    angle_type: str = Form("FRONTAL")
):
    result = register_face_from_dahua(
        name=name,
        role=role,
        consent=consent,
        group_tag=group_tag,
        angle_type=angle_type
    )
    return result


@router.post("/match")
def match_face(
    image: UploadFile = File(...)
):
    filename = f"{uuid.uuid4().hex}_{Path(image.filename).name}" if image.filename else f"{uuid.uuid4().hex}.jpg"
    file_path = UPLOAD_DIR / filename

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


@router.delete("/people/{person_id}")
def delete_person_endpoint(person_id: int):
    success = delete_person(person_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy người có ID {person_id}"
        )
    return {
        "success": True,
        "message": "Đã xóa hồ sơ và ngừng đối chiếu thành công"
    }


@router.post("/people/{person_id}/samples")
def add_sample_endpoint(
    person_id: int,
    angle_type: str = Form("OTHER"),
    image: UploadFile = File(...)
):
    filename = f"{uuid.uuid4().hex}_{Path(image.filename).name}" if image.filename else f"{uuid.uuid4().hex}.jpg"
    file_path = UPLOAD_DIR / filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    result = add_face_sample_to_person(
        person_id=person_id,
        image_path=str(file_path),
        angle_type=angle_type
    )
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message", "Không thể thêm góc mặt")
        )
    return result


@router.get("/people/{person_id}/samples")
def get_person_samples(person_id: int):
    from services.db_service import get_embeddings_by_person_id, get_person_by_id
    person = get_person_by_id(person_id)
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy người có ID {person_id}"
        )
    samples = get_embeddings_by_person_id(person_id)
    clean_samples = [
        {
            "id": s["id"],
            "person_id": s["person_id"],
            "image_path": s["image_path"],
            "angle_type": s.get("angle_type", "FRONTAL"),
            "quality_score": s.get("quality_score", 1.0),
            "created_at": s["created_at"]
        }
        for s in samples
    ]
    return {
        "success": True,
        "person": person,
        "samples": clean_samples
    }
