import os
import sys
import tempfile
import numpy as np
import cv2

sys.stdout.reconfigure(encoding='utf-8')

# Set test environment
os.environ["FIREEYE_DATA_DIR"] = tempfile.mkdtemp()
sys.path.insert(0, os.path.abspath("FireEye/FireEye"))

from services.db_service import (
    init_db,
    insert_person,
    insert_face_embedding,
    get_all_face_embeddings,
    get_people,
    get_person_by_id,
    get_embeddings_by_person_id,
    delete_person_db,
    get_now
)
from services.face_service import (
    cosine_similarity,
    assess_face_quality,
    normalize_image_orientation,
    reload_embeddings_cache,
    _known_embeddings_cache
)

def run_tests():
    print("=== BẮT ĐẦU KIỂM TRA BACKEND NHẬN DIỆN & ĐĂNG KÝ GƯƠNG MẶT ===")
    
    # 1. Test Database Initialization & Migration
    print("\n1. Khởi tạo & di trú cơ sở dữ liệu SQLite...")
    init_db()
    print("   [OK] init_db() thành công, đã tự động bổ sung các cột mới.")
    
    # 2. Test Person Enrollment with Consent & Group Tag
    print("\n2. Đăng ký hồ sơ người tham gia (insert_person)...")
    person_id = insert_person(
        name="Nguyễn Văn A",
        role="Admin",
        avatar_path="/static/faces/test_avatar.jpg",
        consented_at=get_now(),
        group_tag="FAMILY",
        notes="Hồ sơ kiểm thử"
    )
    assert person_id is not None and person_id > 0, "Failed to insert person"
    print(f"   [OK] Đã tạo người với person_id = {person_id}")
    
    # 3. Test Multi-Angle Embeddings (Chính diện + Nghiêng + Kính)
    print("\n3. Thêm mẫu embeddings đa góc mặt (insert_face_embedding)...")
    emb_frontal = np.random.randn(512).astype(np.float32)
    emb_frontal /= np.linalg.norm(emb_frontal)
    
    emb_id1 = insert_face_embedding(
        person_id=person_id,
        embedding=emb_frontal,
        image_path="/static/faces/sample_frontal.jpg",
        angle_type="FRONTAL",
        quality_score=0.95
    )
    assert emb_id1 > 0
    print(f"   [OK] Đã thêm góc FRONTAL (id = {emb_id1})")
    
    emb_left = np.random.randn(512).astype(np.float32)
    emb_left /= np.linalg.norm(emb_left)
    emb_id2 = insert_face_embedding(
        person_id=person_id,
        embedding=emb_left,
        image_path="/static/faces/sample_left.jpg",
        angle_type="LEFT_PROFILE",
        quality_score=0.88
    )
    assert emb_id2 > 0
    print(f"   [OK] Đã thêm góc LEFT_PROFILE (id = {emb_id2})")
    
    # 4. Test Queries & Samples Count
    print("\n4. Kiểm tra truy vấn danh sách người và đếm số mẫu (get_people)...")
    people = get_people()
    assert len(people) >= 1, "Expected at least 1 person"
    found = next((p for p in people if p["id"] == person_id), None)
    assert found is not None, "Person not found in get_people()"
    assert found["name"] == "Nguyễn Văn A"
    assert found["group_tag"] == "FAMILY"
    assert found["samples_count"] == 2, f"Expected 2 samples, got {found['samples_count']}"
    print(f"   [OK] get_people() trả về chính xác: name='{found['name']}', group_tag='{found['group_tag']}', samples_count={found['samples_count']}")
    
    # 5. Test Embeddings Cache & Cosine Similarity Matching
    print("\n5. Kiểm tra nạp RAM Cache & thuật toán đối sánh Cosine Similarity...")
    reload_embeddings_cache()
    all_embs = get_all_face_embeddings()
    assert len(all_embs) >= 2, "Expected at least 2 embeddings"
    
    # Test identical match
    sim_self = cosine_similarity(emb_frontal, emb_frontal)
    assert abs(sim_self - 1.0) < 1e-4, f"Self-similarity should be 1.0, got {sim_self}"
    print(f"   [OK] Cosine similarity bản thân = {sim_self:.4f} (Chính xác 100%)")
    
    # Test noisy match
    noise = np.random.randn(512).astype(np.float32)
    noise /= np.linalg.norm(noise)
    emb_noisy = emb_frontal * 0.95 + noise * 0.05
    emb_noisy /= np.linalg.norm(emb_noisy)
    sim_noisy = cosine_similarity(emb_frontal, emb_noisy)
    assert sim_noisy > 0.90, f"Noisy similarity should be > 0.90, got {sim_noisy}"
    print(f"   [OK] Cosine similarity với ảnh biến thiên nhẹ = {sim_noisy:.4f} (Đạt ngưỡng nhận diện)")
    
    # Test different person match
    diff_person = np.random.randn(512).astype(np.float32)
    diff_person /= np.linalg.norm(diff_person)
    sim_diff = cosine_similarity(emb_frontal, diff_person)
    assert sim_diff < 0.40, f"Different person similarity should be < 0.40, got {sim_diff}"
    print(f"   [OK] Cosine similarity với người khác = {sim_diff:.4f} (< 0.40, phân biệt chính xác)")
    
    # 6. Test Face Quality Assessment (Laplacian Variance)
    print("\n6. Kiểm tra hàm đánh giá chất lượng ảnh (assess_face_quality)...")
    # Sharp image
    sharp_img = np.zeros((100, 100, 3), dtype=np.uint8)
    cv2.rectangle(sharp_img, (20, 20), (80, 80), (255, 255, 255), -1)
    score_sharp = assess_face_quality(sharp_img)
    
    # Blurry image
    blurry_img = cv2.GaussianBlur(sharp_img, (21, 21), 0)
    score_blurry = assess_face_quality(blurry_img)
    assert score_sharp > score_blurry, "Sharp image must have higher quality score than blurry image"
    print(f"   [OK] Điểm ảnh nét: {score_sharp:.2f} > Điểm ảnh mờ: {score_blurry:.2f}")
    
    # 7. Test Deletion & Withdrawal of Consent
    print("\n7. Kiểm tra thu hồi đồng ý và xóa dữ liệu (delete_person_db)...")
    del_ok = delete_person_db(person_id)
    assert del_ok is True, "Delete person should return True"
    assert get_person_by_id(person_id) is None, "Person should be deleted"
    assert len(get_embeddings_by_person_id(person_id)) == 0, "Embeddings should be cascaded deleted"
    print("   [OK] Đã xóa hoàn toàn hồ sơ và toàn bộ embeddings liên quan.")
    
    print("\n=== TOÀN BỘ CÁC BƯỚC KIỂM TRA BACKEND ĐÃ VƯỢT QUA 100% ===")

if __name__ == "__main__":
    run_tests()
