from fastapi import APIRouter
from pydantic import BaseModel

from services.camera_service import camera_service

router = APIRouter()


class StopRequest(BaseModel):
    code: str = "left"


def reset_mqtt_active_zone():
    try:
        from services.mqtt_service import mqtt_service
        mqtt_service.reset_active_zone()
    except Exception as e:
        print("Lỗi reset active_zone trong ptz_route:", e)


@router.post("/api/camera/left")
def camera_left():
    reset_mqtt_active_zone()
    ok = camera_service.move_left()
    return {"success": ok, "action": "left"}


@router.post("/api/camera/right")
def camera_right():
    reset_mqtt_active_zone()
    ok = camera_service.move_right()
    return {"success": ok, "action": "right"}


@router.post("/api/camera/up")
def camera_up():
    reset_mqtt_active_zone()
    ok = camera_service.move_up()
    return {"success": ok, "action": "up"}


@router.post("/api/camera/down")
def camera_down():
    reset_mqtt_active_zone()
    ok = camera_service.move_down()
    return {"success": ok, "action": "down"}


@router.post("/api/camera/zoom-in")
def camera_zoom_in():
    reset_mqtt_active_zone()
    ok = camera_service.zoom_in()
    return {"success": ok, "action": "zoom-in"}


@router.post("/api/camera/zoom-out")
def camera_zoom_out():
    reset_mqtt_active_zone()
    ok = camera_service.zoom_out()
    return {"success": ok, "action": "zoom-out"}


@router.post("/api/camera/stop")
def camera_stop(data: StopRequest):
    reset_mqtt_active_zone()
    ok = camera_service.stop(data.code)
    return {
        "success": ok,
        "action": "stop",
        "code": data.code
    }


@router.post("/api/camera/zone/{zone_id}")
def camera_zone(zone_id: int):
    try:
        from services.mqtt_service import mqtt_service
        import time
        mqtt_service.active_zone = zone_id
        mqtt_service.last_zone_change_time = time.time()
    except Exception as e:
        print("Lỗi đồng bộ active_zone trong camera_zone:", e)
    return camera_service.goto_zone(zone_id)


@router.post("/api/camera/home")
def camera_home():
    reset_mqtt_active_zone()
    return camera_service.go_home()


@router.post("/api/camera/set-home")
def camera_set_home():
    return camera_service.set_home()


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


@router.post("/api/camera/zone/{zone_id}/set")
def camera_set_zone(zone_id: int):
    from config.settings import ZONE_CONFIG
    zone_info = ZONE_CONFIG.get(zone_id)
    if not zone_info or "preset" not in zone_info:
        return {
            "success": False,
            "message": f"Zone {zone_id} is not configured with a preset"
        }
    
    preset_id = zone_info["preset"]
    ok = camera_service.set_preset(preset_id)
    return {
        "success": ok,
        "action": f"set_zone_{zone_id}_preset",
        "preset_id": preset_id
    }