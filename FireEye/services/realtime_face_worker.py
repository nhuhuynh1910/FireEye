import cv2
import time
import threading

from services.camera_service import camera_service
from services.snapshot_service import save_frame_snapshot
from services.face_service import match_face_from_image
from services.db_service import insert_event
from services.mqtt_service import mqtt_service

_worker_thread = None
_worker_running = False
_last_seen = {}

SCAN_INTERVAL = 3
COOLDOWN_SECONDS = 30
MOTION_THRESHOLD = 600  # Số pixel biến đổi tối thiểu (trên ảnh 320x180) để coi là có chuyển động


def _should_log(key: str):
    now = time.time()
    last_time = _last_seen.get(key, 0)

    if now - last_time >= COOLDOWN_SECONDS:
        _last_seen[key] = now
        return True

    return False


def _face_loop():
    global _worker_running

    prev_gray = None
    active_scans_remaining = 0

    while _worker_running:
        try:
            # 1. Lấy frame trực tiếp từ camera_service (qua RAM/SHM, không ghi đĩa)
            ret, frame = camera_service.get_latest_frame()
            if not ret or frame is None:
                time.sleep(SCAN_INTERVAL)
                continue

            # 2. Motion Gating: Kiểm tra chuyển động trên ảnh xám thu nhỏ (320x180)
            small = cv2.resize(frame, (320, 180))
            gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
            gray = cv2.GaussianBlur(gray, (21, 21), 0)

            motion_detected = False
            if prev_gray is not None:
                frame_delta = cv2.absdiff(prev_gray, gray)
                thresh = cv2.threshold(frame_delta, 25, 255, cv2.THRESH_BINARY)[1]
                motion_pixels = cv2.countNonZero(thresh)
                if motion_pixels >= MOTION_THRESHOLD:
                    motion_detected = True
                    # Duy trì quét thêm 2 chu kỳ tiếp theo để tránh sót người đứng yên sau khi di chuyển
                    active_scans_remaining = 2
            else:
                # Chu kỳ đầu tiên: lưu baseline
                prev_gray = gray
                time.sleep(SCAN_INTERVAL)
                continue

            prev_gray = gray

            # Nếu không có chuyển động và hết cửa sổ active, bỏ qua toàn bộ xử lý Face AI
            if not motion_detected:
                if active_scans_remaining > 0:
                    active_scans_remaining -= 1
                else:
                    time.sleep(SCAN_INTERVAL)
                    continue

            # 3. Chạy nhận dạng khuôn mặt trực tiếp trên frame bộ nhớ (không ghi đĩa trước)
            result = match_face_from_image(frame)
            faces = result.get("results", [])

            # Nếu không tìm thấy khuôn mặt nào, không cần tạo snapshot tốn dung lượng
            if not faces:
                time.sleep(SCAN_INTERVAL)
                continue

            # 4. Khi có khuôn mặt, lưu snapshot duy nhất 1 lần để làm bằng chứng sự kiện
            snapshot_path = None

            for face in faces:
                matched = face.get("matched", False)
                name = face.get("name", "Unknown")
                confidence = face.get("confidence", 0)

                if matched:
                    event_key = f"KNOWN_{name}"

                    if _should_log(event_key):
                        if snapshot_path is None:
                            snapshot_path = save_frame_snapshot(frame, "face_auto")

                        message = f"{name} đã có mặt"

                        insert_event(
                            event_type="KNOWN_PERSON",
                            source="FACE_AI",
                            risk_level="LOW",
                            confidence=confidence,
                            message=message,
                            snapshot_path=snapshot_path
                        )

                        mqtt_service.publish_alert({
                            "source": "face_ai",
                            "event_type": "KNOWN_PERSON",
                            "message": message,
                            "name": name,
                            "confidence": confidence,
                            "snapshot": snapshot_path
                        })

                else:
                    event_key = "UNKNOWN_PERSON"

                    if _should_log(event_key):
                        if snapshot_path is None:
                            snapshot_path = save_frame_snapshot(frame, "face_auto")

                        message = "Đã phát hiện người lạ"

                        insert_event(
                            event_type="UNKNOWN_PERSON",
                            source="FACE_AI",
                            risk_level="HIGH",
                            confidence=confidence,
                            message=message,
                            snapshot_path=snapshot_path
                        )

                        mqtt_service.publish_alert({
                            "source": "face_ai",
                            "event_type": "UNKNOWN_PERSON",
                            "message": message,
                            "confidence": confidence,
                            "snapshot": snapshot_path
                        })

        except Exception as e:
            print("Realtime face worker error:", e)

        time.sleep(SCAN_INTERVAL)


def start_face_worker():
    global _worker_thread, _worker_running

    if _worker_running:
        return {
            "success": True,
            "message": "Face worker đang chạy"
        }

    _worker_running = True

    _worker_thread = threading.Thread(
        target=_face_loop,
        daemon=True
    )

    _worker_thread.start()

    return {
        "success": True,
        "message": "Đã bật realtime face matching"
    }


def stop_face_worker():
    global _worker_running

    _worker_running = False

    return {
        "success": True,
        "message": "Đã tắt realtime face matching"
    }


def get_face_worker_status():
    try:
        from services.face_service import face_app
        available = face_app is not None
    except Exception:
        available = False

    return {
        "available": available,
        "running": _worker_running,
        "scan_interval": SCAN_INTERVAL,
        "cooldown_seconds": COOLDOWN_SECONDS,
        "motion_gated": True
    }
