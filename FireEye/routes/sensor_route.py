# routes/sensor_route.py

from flask import Blueprint, jsonify, request
from data.state import get_sensor_state, update_sensor

sensor_bp = Blueprint("sensor", __name__)


@sensor_bp.route("/api/sensors", methods=["GET"])
def get_sensors():
    return jsonify(get_sensor_state())


@sensor_bp.route("/api/sensors/update", methods=["POST"])
def update_sensors():
    data = request.get_json()

    smoke_detected = data.get("smokeDetected", False)
    flame_detected = data.get("flameDetected", False)
    smoke_value = data.get("smokeValue", 0)
    flame_value = data.get("flameValue", 0)

    update_sensor(
        smoke_detected=smoke_detected,
        flame_detected=flame_detected,
        smoke_value=smoke_value,
        flame_value=flame_value
    )

    return jsonify({
        "success": True,
        "message": "Sensor data updated",
        "data": get_sensor_state()
    })