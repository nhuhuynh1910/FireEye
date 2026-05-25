# -*- coding: utf-8 -*-

from flask import Flask, jsonify
from flask_cors import CORS

from config.settings import SERVER_HOST, SERVER_PORT, DEBUG
from routes.status_route import status_bp
from routes.camera_route import camera_bp
from routes.sensor_route import sensor_bp
from routes.ai_route import ai_bp
from routes.ptz_routes import ptz_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(status_bp)
app.register_blueprint(camera_bp)
app.register_blueprint(sensor_bp)
app.register_blueprint(ai_bp)
app.register_blueprint(ptz_bp)

@app.route("/")
def home():
    return jsonify({
        "message": "FireEye Backend Running",
        "device": "Raspberry Pi 5 + Hailo 8L",
        "camera": "Dahua IP Camera LAN",
        "apis": [
            "/api/status",
            "/api/camera/status",
            "/api/camera/stream",
            "/api/sensors",
            "/api/sensors/update",
            "/api/ai/status",
            "/api/camera/left",
            "/api/camera/right",
            "/api/camera/up",
            "/api/camera/down",
            "/api/camera/zoom-in",
            "/api/camera/zoom-out",
            "/api/camera/stop"
        ]
    })

if __name__ == "__main__":
    app.run(
        host=SERVER_HOST,
        port=SERVER_PORT,
        debug=DEBUG,
        threaded=True
    )