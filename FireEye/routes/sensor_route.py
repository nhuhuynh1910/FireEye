from fastapi import APIRouter
from pydantic import BaseModel

from data.state import get_sensor_state, update_sensor
from services.mqtt_service import mqtt_service

router = APIRouter()


class SensorRequest(BaseModel):
    smokeDetected: bool = False
    flameDetected: bool = False
    smokeValue: int = 0
    flameValue: int = 0
    node: str | None = None


@router.get("/api/sensors")
def get_sensors():
    return get_sensor_state()


@router.post("/api/sensors/update")
def update_sensors(data: SensorRequest):
    result = update_sensor(
        smoke_detected=data.smokeDetected,
        flame_detected=data.flameDetected,
        smoke_value=data.smokeValue,
        flame_value=data.flameValue,
        node=data.node
    )

    if result["alertLevel"] != "safe":
        mqtt_service.publish_alert({
            "source": "sensor",
            "alertLevel": result["alertLevel"],
            "data": result
        })

    return {
        "success": True,
        "message": "Sensor data updated",
        "data": result
    }