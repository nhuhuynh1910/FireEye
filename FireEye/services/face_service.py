import cv2
import json
import numpy as np
from pathlib import Path
from insightface.app import FaceAnalysis

from services.db_service import (
    insert_person,
    insert_face_embedding,
    get_all_face_embeddings,
    get_people
)

FACE_DIR = Path("static/faces")
FACE_DIR.mkdir(parents=True, exist_ok=True)

face_app = FaceAnalysis(name="buffalo_s")
face_app.prepare(ctx_id=-1, det_size=(320, 320))


def cosine_similarity(a, b):
    return float(
        np.dot(a, b) / (
            np.linalg.norm(a) * np.linalg.norm(b)
        )
    )


def register_face_from_image(
    name: str,
    role: str,
    image_path: str
):
    img = cv2.imread(image_path)

    if img is None:
        return {
            "success": False,
            "message": "Không đọc được ảnh"
        }

    faces = face_app.get(img)

    if len(faces) == 0:
        return {
            "success": False,
            "message": "Không tìm thấy gương mặt trong ảnh"
        }

    face = faces[0]
    embedding = face.embedding

    avatar_name = f"{name.replace(' ', '_').lower()}.jpg"
    avatar_path = FACE_DIR / avatar_name

    cv2.imwrite(str(avatar_path), img)

    public_avatar_path = f"/static/faces/{avatar_name}"

    person_id = insert_person(
        name=name,
        role=role,
        avatar_path=public_avatar_path
    )

    embedding_id = insert_face_embedding(
        person_id=person_id,
        embedding=embedding,
        image_path=public_avatar_path
    )

    return {
        "success": True,
        "message": "Đăng ký gương mặt thành công",
        "person_id": person_id,
        "embedding_id": embedding_id,
        "name": name,
        "role": role,
        "avatar_path": public_avatar_path
    }


def match_face_from_image(
    image_path: str,
    threshold: float = 0.45
):
    img = cv2.imread(image_path)

    if img is None:
        return {
            "success": False,
            "message": "Không đọc được ảnh"
        }

    faces = face_app.get(img)

    if len(faces) == 0:
        return {
            "success": True,
            "faces_detected": 0,
            "results": []
        }

    known_embeddings = get_all_face_embeddings()

    results = []

    for face in faces:
        current_embedding = face.embedding

        best_score = 0.0
        best_person = None

        for known in known_embeddings:
            known_embedding = np.array(
                json.loads(known["embedding"]),
                dtype=np.float32
            )

            score = cosine_similarity(
                current_embedding,
                known_embedding
            )

            if score > best_score:
                best_score = score
                best_person = known

        bbox = face.bbox.astype(int).tolist()

        if best_person and best_score >= threshold:
            results.append({
                "matched": True,
                "name": best_person["name"],
                "role": best_person["role"],
                "confidence": round(best_score, 3),
                "bbox": bbox
            })
        else:
            results.append({
                "matched": False,
                "name": "Unknown",
                "role": None,
                "confidence": round(best_score, 3),
                "bbox": bbox
            })

    return {
        "success": True,
        "faces_detected": len(results),
        "results": results
    }


def list_people():
    return get_people()
from services.snapshot_service import capture_snapshot


def match_face_from_dahua():
    snapshot_path = capture_snapshot("face")

    if snapshot_path is None:
        return {
            "success": False,
            "message": "Không chụp được ảnh từ camera Dahua"
        }

    local_path = snapshot_path.replace("/static/", "static/")

    result = match_face_from_image(local_path)

    result["snapshot"] = snapshot_path

    return result
