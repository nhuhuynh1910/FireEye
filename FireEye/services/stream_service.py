import cv2
from services.camera_service import camera_service
from data.state import get_ai_state


def generate_camera_stream():
    cap = camera_service.get_capture()

    while True:
        success, frame = cap.read()

        if not success:
            break

        h_orig, w_orig = frame.shape[:2]
        frame = cv2.resize(frame, (960, 540))

        # Check if AI alert is active
        ai = get_ai_state()
        if ai.get("fireDetected") or ai.get("smokeDetected") or ai.get("humanDetected"):
            bbox = ai.get("bbox")
            
            # Determine color and label based on detected class
            if ai.get("fireDetected"):
                label = "YOLOv8: FIRE"
                color = (0, 0, 255)  # Red (BGR)
            elif ai.get("smokeDetected"):
                label = "YOLOv8: SMOKE"
                color = (0, 165, 255)  # Orange (BGR)
            else:
                label = "YOLOv8: HUMAN"
                color = (255, 0, 0)  # Blue (BGR)

            if bbox and len(bbox) == 4:
                # Scale coordinates from original resolution to 960x540
                x_scale = 960.0 / w_orig
                y_scale = 540.0 / h_orig
                x1 = int(bbox[0] * x_scale)
                y1 = int(bbox[1] * y_scale)
                x2 = int(bbox[2] * x_scale)
                y2 = int(bbox[3] * y_scale)
            else:
                # Default fallback coordinates
                x1, y1, x2, y2 = 408, 218, 588, 388
            
            # Draw bounding box
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            
            # Draw label with background
            conf = ai.get("confidence", 0.0)
            label = f"{label} {int(conf * 100)}%"
            
            # Solid background for text label
            (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            label_y1 = max(y1 - 20, 0)
            label_y2 = max(y1, 20)
            cv2.rectangle(frame, (x1, label_y1), (x1 + w, label_y2), color, -1)
            cv2.putText(frame, label, (x1, label_y2 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)

        ret, buffer = cv2.imencode(".jpg", frame)

        if not ret:
            continue

        frame_bytes = buffer.tobytes()

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
        )

    cap.release()