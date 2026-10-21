# -*- coding: utf-8 -*-

from contextlib import asynccontextmanager
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
from routes.sprinkler_route import router as sprinkler_router
from routes.auth_route import router as auth_router
from routes.user_route import router as user_router
from routes.safety_control_route import router as safety_control_router, restore_active_sessions_on_startup
from services.mqtt_service import mqtt_service
from services.db_service import init_db, create_default_admin_if_not_exists
from services.cleanup_service import start_cleanup_worker
from services.camera_service import camera_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    init_db()
    create_default_admin_if_not_exists()
    mqtt_service.start()
    await restore_active_sessions_on_startup()
    start_cleanup_worker()
    camera_service.start_grabber()
    yield
    # --- Shutdown ---
    mqtt_service.stop()
    camera_service.stop_grabber()

app = FastAPI(
    title="FireEye Backend",
    description="Raspberry Pi 5 + Hailo 8L + Dahua Camera + MQTT",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration supporting credentials (cookies) and localhost / LAN IP patterns
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+)(:\d+)?",
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
app.include_router(sprinkler_router)
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(safety_control_router)




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
            "/api/camera/left",
            "/api/camera/right",
            "/api/camera/up",
            "/api/camera/down",
            "/api/camera/zoom-in",
            "/api/camera/zoom-out",
            "/api/camera/stop",
            "/api/camera/zone/{zone_id}",
            "/api/camera/home",
            "/api/camera/zones",

            "/api/sensors",
            "/api/sensors/update",

            "/api/ai/status",
            "/api/ai/detect",

            "/api/mqtt/status",
            "/api/events",

            "/api/notifications",
            "/api/notifications/unread-count",
            "/api/notifications/read-all",
            "/api/notifications/{event_id}/read",

            "/api/faces/register",
            "/api/faces/match",
            "/api/faces/match-camera",
            "/api/faces/watch/start",
            "/api/faces/watch/stop",
            "/api/faces/watch/status",
            "/api/faces/people",

            "/static/snapshots/{filename}",
            "/api/sprinkler/zone/{zone_id}/accept",
            "/api/sprinkler/zone/{zone_id}/reject",
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