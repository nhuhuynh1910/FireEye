# -*- coding: utf-8 -*-

from flask import Blueprint, jsonify, request
from services.camera_service import camera_service

ptz_bp = Blueprint("ptz", __name__)

@ptz_bp.route("/api/camera/left", methods=["POST"])
def camera_left():
    ok = camera_service.move_left()
    return jsonify({"success": ok, "action": "left"})

@ptz_bp.route("/api/camera/right", methods=["POST"])
def camera_right():
    ok = camera_service.move_right()
    return jsonify({"success": ok, "action": "right"})

@ptz_bp.route("/api/camera/up", methods=["POST"])
def camera_up():
    ok = camera_service.move_up()
    return jsonify({"success": ok, "action": "up"})

@ptz_bp.route("/api/camera/down", methods=["POST"])
def camera_down():
    ok = camera_service.move_down()
    return jsonify({"success": ok, "action": "down"})

@ptz_bp.route("/api/camera/zoom-in", methods=["POST"])
def camera_zoom_in():
    ok = camera_service.zoom_in()
    return jsonify({"success": ok, "action": "zoom-in"})

@ptz_bp.route("/api/camera/zoom-out", methods=["POST"])
def camera_zoom_out():
    ok = camera_service.zoom_out()
    return jsonify({"success": ok, "action": "zoom-out"})

@ptz_bp.route("/api/camera/stop", methods=["POST"])
def camera_stop():
    data = request.get_json(silent=True) or {}
    code = data.get("code", "Left")

    ok = camera_service.stop(code)

    return jsonify({
        "success": ok,
        "action": "stop",
        "code": code
    })