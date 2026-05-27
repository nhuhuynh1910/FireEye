# -*- coding: utf-8 -*-

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.status_route import router as status_router
from routes.camera_route import router as camera_router
from routes.sensor_route import router as sensor_router
from routes.ai_route import router as ai_router
from routes.ptz_routes import router as ptz_router
from routes.mqtt_route import router as mqtt_router

from services.mqtt_service import mqtt_service

app = FastAPI(
    title="FireEye Backend",
    description="Raspberry Pi 5 + Hailo 8L + Dahua Camera + MQTT",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(status_router)
app.include_router(camera_router)
app.include_router(sensor_router)
app.include_router(ai_router)
app.include_router(ptz_router)
app.include_router(mqtt_router)


@app.on_event("startup")
def startup_event():
    mqtt_service.start()


@app.on_event("shutdown")
def shutdown_event():
    mqtt_service.stop()


@app.get("/")
def home():
    return {
        "message": "FireEye Backend Running",
        "framework": "FastAPI",
        "device": "Raspberry Pi 5 + Hailo 8L",
        "camera": "Dahua IP Camera LAN",
        "mqtt": "enabled",
        "apis": [
            "/api/status",
            "/api/camera/status",
            "/api/camera/stream",
            "/api/sensors",
            "/api/sensors/update",
            "/api/ai/status",
            "/api/ai/detect",
            "/api/mqtt/status",
            "/api/camera/left",
            "/api/camera/right",
            "/api/camera/up",
            "/api/camera/down",
            "/api/camera/zoom-in",
            "/api/camera/zoom-out",
            "/api/camera/stop"
        ]
    }