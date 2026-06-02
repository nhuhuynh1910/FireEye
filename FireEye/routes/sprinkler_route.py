from fastapi import APIRouter

from services.mqtt_service import mqtt_service
from services.camera_service import camera_service

router = APIRouter()


@router.post("/api/sprinkler/zone/{zone_id}/accept")
def accept_sprinkler(zone_id: int):
    motor_result = mqtt_service.publish_motor_zone(zone_id, 1)

    return {
        "success": True,
        "zone_id": zone_id,
        "action": "sprinkler_on",
        "motor": motor_result
    }


@router.post("/api/sprinkler/zone/{zone_id}/reject")
def reject_sprinkler(zone_id: int):
    motor_result = mqtt_service.publish_motor_zone(zone_id, 0)

    mqtt_service.reset_active_zone()

    camera_result = camera_service.go_home()

    return {
        "success": True,
        "zone_id": zone_id,
        "action": "sprinkler_rejected",
        "motor": motor_result,
        "camera": camera_result
    }