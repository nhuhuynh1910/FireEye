from flask import Blueprint, jsonify
from services.camera_service import camera_service
from services.hailo_service import hailo_service

status_bp = Blueprint("status", __name__)


@status_bp.route("/api/status", methods=["GET"])
def get_status():
    camera_online = camera_service.check_camera()

    return jsonify({
        "backend": "online",
        "device": "Laptop test / Raspberry Pi 5",
        "aiAccelerator": hailo_service.get_status(),
        "camera": {
            "type": "Webcam Laptop",
            "online": camera_online
        }
    })