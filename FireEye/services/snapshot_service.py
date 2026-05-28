import cv2
from pathlib import Path
from datetime import datetime

from services.camera_service import camera_service

SNAPSHOT_DIR = Path("static/snapshots")
SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)


def capture_snapshot(event_type: str = "event"):
    cap = camera_service.get_capture()

    if not cap.isOpened():
        cap.release()
        return None

    ret, frame = cap.read()
    cap.release()

    if not ret:
        return None

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{event_type.lower()}_{timestamp}.jpg"
    file_path = SNAPSHOT_DIR / filename

    cv2.imwrite(str(file_path), frame)

    return f"/static/snapshots/{filename}"