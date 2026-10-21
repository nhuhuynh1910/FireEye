from fastapi import APIRouter, Response
from fastapi.responses import StreamingResponse
import cv2

from services.camera_service import camera_service
from services.stream_service import generate_camera_stream
from config.settings import CAMERA_IP

router = APIRouter()


@router.get("/api/camera/status")
def camera_status():
    online = camera_service.check_camera()

    return {
        "cameraOnline": online,
        "cameraType": "Dahua IP Camera LAN",
        "cameraIP": CAMERA_IP,
        "message": "Dahua camera connected" if online else "Dahua camera offline"
    }


@router.get("/api/camera/stream")
def camera_stream():
    return StreamingResponse(
        generate_camera_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@router.get("/api/camera/raw-frame")
def get_raw_frame():
    success, frame = camera_service.get_latest_frame()
    if not success or frame is None:
        return Response(status_code=404, content="Camera frame not available")
    
    ret, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
    if not ret:
        return Response(status_code=500, content="Failed to encode frame")
    
    return Response(content=buffer.tobytes(), media_type="image/jpeg")