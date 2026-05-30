import cv2
from services.camera_service import camera_service
from data.state import get_ai_state


def generate_camera_stream():
    cap = camera_service.get_capture()

    while True:
        success, frame = cap.read()

        if not success:
            break

        frame = cv2.resize(frame, (960, 540))

        # Check if AI alert is active
        ai = get_ai_state()
        if ai.get("fireDetected") or ai.get("smokeDetected"):
            bbox = ai.get("bbox")
            if bbox and len(bbox) == 4:
                x1, y1, x2, y2 = bbox
            else:
                # Default fallback coordinates
                x1, y1, x2, y2 = 408, 218, 588, 388
            
            # Draw red bounding box (BGR: 0, 0, 255)
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
            
            # Draw label with background
            label = "YOLOv8: FIRE" if ai.get("fireDetected") else "YOLOv8: SMOKE"
            conf = ai.get("confidence", 0.0)
            label = f"{label} {int(conf * 100)}%"
            
            # Solid background for text label
            (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(frame, (x1, y1 - 20), (x1 + w, y1), (0, 0, 255), -1)
            cv2.putText(frame, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)

        ret, buffer = cv2.imencode(".jpg", frame)

        if not ret:
            continue

        frame_bytes = buffer.tobytes()

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
        )

    cap.release()