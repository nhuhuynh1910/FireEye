from fastapi import APIRouter
from pydantic import BaseModel

from services.mqtt_service import mqtt_service
from data.state import update_sprinkler, get_sprinkler_state

router = APIRouter()


class SprinklerRequest(BaseModel):
    action: str


@router.get("/api/mqtt/status")
def mqtt_status():
    return mqtt_service.get_status()


@router.get("/api/sprinkler/status")
def sprinkler_status():
    return get_sprinkler_state()


@router.post("/api/sprinkler/control")
def sprinkler_control(data: SprinklerRequest):
    result = update_sprinkler(data.action)

    if result is None:
        return {
            "success": False,
            "message": "Action phải là ON hoặc OFF"
        }

    mqtt_service.publish_control({
        "action": result["status"]
    })

    return {
        "success": True,
        "message": f"Sprinkler {result['status']}",
        "data": result
    }