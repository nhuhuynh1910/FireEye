# test cam dahua LAN
from flask import Blueprint, jsonify, Response
from services.camera_service import camera_service
from services.stream_service import generate_camera_stream
from config.settings import CAMERA_IP

camera_bp = Blueprint("camera", __name__)


@camera_bp.route("/api/camera/status", methods=["GET"])
def camera_status():
    online = camera_service.check_camera()

    return jsonify({
        "cameraOnline": online,
        "cameraType": "Dahua IP Camera LAN",
        "cameraIP": CAMERA_IP,
        "message": "Dahua camera connected" if online else "Dahua camera offline"
    })


@camera_bp.route("/api/camera/stream", methods=["GET"])
def camera_stream():
    return Response(
        generate_camera_stream(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )