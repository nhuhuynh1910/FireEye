# test cam dahua LAN
from flask import Blueprint, jsonify
from services.camera_service import camera_service
from services.hailo_service import hailo_service
from config.settings import CAMERA_IP

status_bp = Blueprint("status", __name__)


@status_bp.route("/api/status", methods=["GET"])
def get_status():
    camera_online = camera_service.check_camera()

    return jsonify({
        "backend": "online",
        "device": "Raspberry Pi 5",
        "aiAccelerator": hailo_service.get_status(),
        "camera": {
            "type": "Dahua IP Camera LAN",
            "ip": CAMERA_IP,
            "online": camera_online
        }
    })