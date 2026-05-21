from flask import Blueprint, jsonify
from services.hailo_service import hailo_service

ai_bp = Blueprint("ai", __name__)


@ai_bp.route("/api/ai/status", methods=["GET"])
def ai_status():
    return jsonify(hailo_service.get_status())