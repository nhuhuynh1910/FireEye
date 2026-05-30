# -*- coding: utf-8 -*-

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routes.status_route import router as status_router
from routes.camera_route import router as camera_router
from routes.sensor_route import router as sensor_router
from routes.ai_route import router as ai_router
from routes.ptz_routes import router as ptz_router
from routes.mqtt_route import router as mqtt_router
from routes.event_route import router as event_router
from routes.face_route import router as face_router
from routes.notification_route import router as notification_router

from services.mqtt_service import mqtt_service
from services.db_service import init_db
from services.cleanup_service import start_cleanup_worker

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

app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(status_router)
app.include_router(camera_router)
app.include_router(sensor_router)
app.include_router(ai_router)
app.include_router(ptz_router)
app.include_router(mqtt_router)
app.include_router(event_router)
app.include_router(face_router)
app.include_router(notification_router)


@app.on_event("startup")
def startup_event():
    init_db()
    mqtt_service.start()
    start_cleanup_worker()


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
            "/api/events",

            "/api/notifications",
            "/api/notifications/unread-count",
            "/api/notifications/{event_id}/read",

            "/api/faces/register",
            "/api/faces/match",
            "/api/faces/match-camera",
            "/api/faces/watch/start",
            "/api/faces/watch/stop",
            "/api/faces/watch/status",
            "/api/faces/people",

            "/api/camera/left",
            "/api/camera/right",
            "/api/camera/up",
            "/api/camera/down",
            "/api/camera/zoom-in",
            "/api/camera/zoom-out",
            "/api/camera/stop",

            "/static/snapshots/{filename}"
        ]
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )