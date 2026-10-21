import time
import threading

from services.snapshot_service import capture_snapshot
from services.face_service import match_face_from_image
from services.db_service import insert_event
from services.mqtt_service import mqtt_service

_worker_thread = None
_worker_running = False
_last_seen = {}

SCAN_INTERVAL = 3
COOLDOWN_SECONDS = 30


def _should_log(key: str):
    now = time.time()
    last_time = _last_seen.get(key, 0)

    if now - last_time >= COOLDOWN_SECONDS:
        _last_seen[key] = now
        return True

    return False


def _face_loop():
    global _worker_running

    while _worker_running:
        try:
            snapshot_path = capture_snapshot("face_auto")

            if snapshot_path is None:
                time.sleep(SCAN_INTERVAL)
                continue

            local_path = snapshot_path.replace("/static/", "static/")
            result = match_face_from_image(local_path)

            faces = result.get("results", [])

            for face in faces:
                matched = face.get("matched", False)
                name = face.get("name", "Unknown")
                confidence = face.get("confidence", 0)

                if matched:
                    event_key = f"KNOWN_{name}"

                    if _should_log(event_key):
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
    return {
        "running": _worker_running,
        "scan_interval": SCAN_INTERVAL,
        "cooldown_seconds": COOLDOWN_SECONDS
    }