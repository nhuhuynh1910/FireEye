import cv2
from services.camera_service import camera_service


def generate_camera_stream():
    cap = camera_service.get_capture()

    while True:
        success, frame = cap.read()

        if not success:
            break

        frame = cv2.resize(frame, (960, 540))

        ret, buffer = cv2.imencode(".jpg", frame)

        if not ret:
            continue

        frame_bytes = buffer.tobytes()

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
        )

    cap.release()