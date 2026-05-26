from fastapi import APIRouter
from fastapi.responses import StreamingResponse

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