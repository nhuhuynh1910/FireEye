import cv2
import json
import numpy as np
import uuid
import threading
from pathlib import Path
from insightface.app import FaceAnalysis

from services.db_service import (
    insert_person,
    insert_face_embedding,
    get_all_face_embeddings,
    get_people
)

from services.snapshot_service import capture_snapshot

FACE_DIR = Path("static/faces")
FACE_DIR.mkdir(parents=True, exist_ok=True)

# Tự động phát hiện CUDA trong onnxruntime để gán ctx_id thích hợp (GPU vs CPU)
try:
    import onnxruntime as ort
    if "CUDAExecutionProvider" in ort.get_available_providers():
        ctx_id = 0
        print("ONNX Runtime: CUDA is available. Running InsightFace on GPU.")
    else:
        ctx_id = -1
        print("ONNX Runtime: CUDA is not available. Running InsightFace on CPU.")
except Exception as e:
    print(f"Error checking CUDA in ONNX Runtime: {e}")
    ctx_id = -1

# Khởi tạo mô hình InsightFace buffalo_s
face_app = FaceAnalysis(name="buffalo_s")
# Dùng det_size=(160, 160) vì đầu vào lúc này chỉ là ảnh đã crop khuôn mặt, giúp tăng tốc độ xử lý rất nhiều
face_app.prepare(ctx_id=ctx_id, det_size=(160, 160))

# Khởi tạo bộ dò tìm khuôn mặt siêu nhẹ Haar Cascade (Stage 1)
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# Cache lưu trữ danh sách embeddings trong RAM dưới dạng numpy array
_known_embeddings_cache = []
_cache_lock = threading.Lock()


def reload_embeddings_cache():
    global _known_embeddings_cache
    rows = get_all_face_embeddings()
    cache = []
    for row in rows:
        try:
            emb = np.array(json.loads(row["embedding"]), dtype=np.float32)
            cache.append({
                "id": row["id"],
                "person_id": row["person_id"],
                "name": row["name"],
                "role": row["role"],
                "embedding": emb,
                "image_path": row["image_path"]
            })
        except Exception as e:
            print("Lỗi chuyển đổi embedding:", e)
    with _cache_lock:
        _known_embeddings_cache = cache
    print(f"Đã nạp {len(cache)} khuôn mặt vào cache.")


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

    h_orig, w_orig = img.shape[:2]

    # Cố gắng sử dụng Haar Cascade để crop khuôn mặt trước khi đăng ký
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    haar_faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
    
    faces = []
    if len(haar_faces) > 0:
        (x, y, w, h) = haar_faces[0]
        pad_x = int(w * 0.2)
        pad_y = int(h * 0.2)
        x1 = max(0, x - pad_x)
        y1 = max(0, y - pad_y)
        x2 = min(w_orig, x + w + pad_x)
        y2 = min(h_orig, y + h + pad_y)
        
        cropped = img[y1:y2, x1:x2]
        if cropped.size > 0:
            faces = face_app.get(cropped)

    # Fallback chạy trực tiếp InsightFace trên toàn ảnh nếu Haar Cascade thất bại
    if len(faces) == 0:
        faces = face_app.get(img)

    if len(faces) == 0:
        return {
            "success": False,
            "message": "Không tìm thấy gương mặt trong ảnh"
        }

    face = faces[0]
    embedding = face.embedding

    avatar_name = f"{uuid.uuid4().hex}.jpg"
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

    # Nạp lại cache sau khi đăng ký thành công
    reload_embeddings_cache()

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
    global _known_embeddings_cache
    img = cv2.imread(image_path)

    if img is None:
        return {
            "success": False,
            "message": "Không đọc được ảnh"
        }

    h_orig, w_orig = img.shape[:2]

    # Stage 1: Quét nhanh bằng Haar Cascade trên ảnh xám (Cực kỳ nhẹ trên CPU Pi 5)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    haar_faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(30, 30)
    )

    # Nếu không có khuôn mặt nào, bỏ qua luôn Stage 2 (InsightFace)
    if len(haar_faces) == 0:
        return {
            "success": True,
            "faces_detected": 0,
            "results": []
        }

    # Nạp cache lần đầu nếu trống
    if not _known_embeddings_cache:
        reload_embeddings_cache()

    with _cache_lock:
        local_cache = list(_known_embeddings_cache)

    results = []

    # Chuẩn bị ma trận embeddings để so sánh véc-tơ hóa
    if local_cache:
        embeddings_matrix = np.stack([k["embedding"] for k in local_cache])  # Shape: (N, 512)
        norms_known = np.linalg.norm(embeddings_matrix, axis=1)  # Shape: (N,)
    else:
        embeddings_matrix = None
        norms_known = None

    # Stage 2: Cắt khuôn mặt và đối khớp với InsightFace trên vùng nhỏ
    for (x, y, w, h) in haar_faces:
        # Thêm biên lề (padding) 20% để giữ độ chính xác nhận diện cấu trúc mặt
        pad_x = int(w * 0.2)
        pad_y = int(h * 0.2)

        x1 = max(0, x - pad_x)
        y1 = max(0, y - pad_y)
        x2 = min(w_orig, x + w + pad_x)
        y2 = min(h_orig, y + h + pad_y)

        cropped_face = img[y1:y2, x1:x2]

        if cropped_face.size == 0:
            continue

        # Chạy InsightFace nhận dạng trên vùng cắt ảnh nhỏ
        faces = face_app.get(cropped_face)
        if len(faces) == 0:
            continue

        face = faces[0]
        current_embedding = face.embedding

        best_score = 0.0
        best_person = None

        if embeddings_matrix is not None and len(local_cache) > 0:
            norm_current = np.linalg.norm(current_embedding)
            if norm_current > 0:
                dot_products = np.dot(embeddings_matrix, current_embedding)
                scores = dot_products / (norms_known * norm_current)

                best_idx = np.argmax(scores)
                best_score = float(scores[best_idx])
                best_person = local_cache[best_idx]

        bbox = [x, y, x + w, y + h]

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


def list_people():
    return get_people()