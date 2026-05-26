from fastapi import APIRouter

from services.camera_service import camera_service
from services.hailo_service import hailo_service
from config.settings import CAMERA_IP
from data.state import get_overall_status

router = APIRouter()


@router.get("/api/status")
def get_status():

    camera_online = camera_service.check_camera()

    status = get_overall_status()

    status["device"] = "Raspberry Pi 5"

    status["aiAccelerator"] = hailo_service.get_status()

    status["camera"] = {
        "type": "Dahua IP Camera LAN",
        "ip": CAMERA_IP,
        "online": camera_online
    }

    return status