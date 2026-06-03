import cv2
from pathlib import Path
from datetime import datetime

from services.camera_service import camera_service

SNAPSHOT_DIR = Path("static/snapshots")
SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)


def capture_snapshot(event_type: str = "event"):
    ret, frame = camera_service.get_latest_frame()

    if not ret or frame is None:
        return None

    # Resize frame to 960x540 to align with the frontend bounding box coordinates
    frame_resized = cv2.resize(frame, (960, 540))

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{event_type.lower()}_{timestamp}.jpg"
    file_path = SNAPSHOT_DIR / filename

    cv2.imwrite(str(file_path), frame_resized)

    return f"/static/snapshots/{filename}"