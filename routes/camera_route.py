from flask import Blueprint, jsonify, Response
from services.camera_service import camera_service
from services.stream_service import generate_camera_stream

camera_bp = Blueprint("camera", __name__)


@camera_bp.route("/api/camera/status", methods=["GET"])
def camera_status():
    online = camera_service.check_camera()

    return jsonify({
        "cameraOnline": online,
        "message": "Camera connected" if online else "Camera offline"
    })


@camera_bp.route("/api/camera/stream", methods=["GET"])
def camera_stream():
    return Response(
        generate_camera_stream(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )