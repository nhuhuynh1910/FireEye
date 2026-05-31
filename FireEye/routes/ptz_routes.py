from fastapi import APIRouter
from pydantic import BaseModel

from services.camera_service import camera_service

router = APIRouter()


class StopRequest(BaseModel):
    code: str = "left"


@router.post("/api/camera/left")
def camera_left():
    ok = camera_service.move_left()
    return {"success": ok, "action": "left"}


@router.post("/api/camera/right")
def camera_right():
    ok = camera_service.move_right()
    return {"success": ok, "action": "right"}


@router.post("/api/camera/up")
def camera_up():
    ok = camera_service.move_up()
    return {"success": ok, "action": "up"}


@router.post("/api/camera/down")
def camera_down():
    ok = camera_service.move_down()
    return {"success": ok, "action": "down"}


@router.post("/api/camera/zoom-in")
def camera_zoom_in():
    ok = camera_service.zoom_in()
    return {"success": ok, "action": "zoom-in"}


@router.post("/api/camera/zoom-out")
def camera_zoom_out():
    ok = camera_service.zoom_out()
    return {"success": ok, "action": "zoom-out"}


@router.post("/api/camera/stop")
def camera_stop(data: StopRequest):
    ok = camera_service.stop(data.code)
    return {
        "success": ok,
        "action": "stop",
        "code": data.code
    }


@router.post("/api/camera/zone/{zone_id}")
def camera_zone(zone_id: int):
    return camera_service.goto_zone(zone_id)


@router.post("/api/camera/home")
def camera_home():
    return camera_service.go_home()

@router.get("/api/camera/zones")
def get_camera_zones():
    return {
        "success": True,
        "zones": {
            1: {"name": "Zone 1", "angle": -45},
            2: {"name": "Zone 2", "angle": 45},
            3: {"name": "Zone 3", "angle": -135},
            4: {"name": "Zone 4", "angle": 135}
        }
    }