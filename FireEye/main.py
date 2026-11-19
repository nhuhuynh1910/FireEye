# -*- coding: utf-8 -*-

from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routes.status_route import router as status_router
from routes.camera_route import router as camera_router
from routes.ai_route import router as ai_router
from routes.ptz_routes import router as ptz_router
from routes.mqtt_route import router as mqtt_router
from routes.event_route import router as event_router
from routes.face_route import router as face_router
from routes.notification_route import router as notification_router
from routes.auth_route import router as auth_router
from routes.user_route import router as user_router
from routes.safety_control_route import router as safety_control_router, restore_active_sessions_on_startup
from routes.audio_route import router as audio_router
from routes.gateway_route import router as gateway_router
from services.audio_service import audio_service
from services.mqtt_service import mqtt_service
from services.db_service import init_db, create_default_admin_if_not_exists
from services.cleanup_service import start_cleanup_worker, stop_cleanup_worker
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
    audio_service.stop_alarm()
    stop_cleanup_worker()
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

DASHBOARD_DIST = Path(__file__).resolve().parent.parent / "FE" / "dashboard-app" / "dist"
if DASHBOARD_DIST.exists():
    app.mount("/dashboard", StaticFiles(directory=str(DASHBOARD_DIST), html=True), name="dashboard")
    if (DASHBOARD_DIST / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(DASHBOARD_DIST / "assets")), name="assets")

app.include_router(status_router)
app.include_router(camera_router)
app.include_router(ai_router)
app.include_router(ptz_router)
app.include_router(mqtt_router)
app.include_router(event_router)
app.include_router(face_router)
app.include_router(notification_router)
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(safety_control_router)
app.include_router(audio_router)
app.include_router(gateway_router)


from fastapi import Request
from fastapi.responses import FileResponse, RedirectResponse, Response


@app.get("/favicon.svg", include_in_schema=False)
def get_favicon():
    fav = DASHBOARD_DIST / "favicon.svg"
    if fav.exists():
        return FileResponse(str(fav))
    return Response(status_code=404)


@app.get("/icons.svg", include_in_schema=False)
def get_icons():
    icons = DASHBOARD_DIST / "icons.svg"
    if icons.exists():
        return FileResponse(str(icons))
    return Response(status_code=404)


@app.get("/")
def home(request: Request):
    accept = request.headers.get("accept", "")
    if "text/html" in accept and DASHBOARD_DIST.exists():
        return RedirectResponse(url="/dashboard/")
    return {
        "message": "IGNIVO Unified System Gateway Running",
        "framework": "FastAPI",
        "device": "Raspberry Pi 5 + Hailo 8L",
        "camera": "Dahua IP Camera LAN",
        "endpoints": {
            "dashboard_ui": "/dashboard/",
            "fireguard_ui": "/ui/",
            "emergency_api": "/api/v1/emergency",
            "fireeye_api": "/api"
        }
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )