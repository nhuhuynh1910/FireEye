from fastapi import APIRouter
from pydantic import BaseModel

from services.hailo_service import hailo_service
from data.state import (
    get_ai_state,
    update_ai_detection
)

from services.mqtt_service import mqtt_service

router = APIRouter()


class AiDetectRequest(BaseModel):
    fire: bool = False
    smoke: bool = False
    confidence: float = 0.0


@router.get("/api/ai/status")
def ai_status():

    return {
        "hailo": hailo_service.get_status(),
        "ai": get_ai_state()
    }


@router.post("/api/ai/detect")
def ai_detect(data: AiDetectRequest):

    result = update_ai_detection(
        fire_detected=data.fire,
        smoke_detected=data.smoke,
        confidence=data.confidence
    )

    danger = data.fire or data.smoke

    if danger:

        mqtt_service.publish_alert({
            "source": "ai",
            "message": "AI phát hiện nguy cơ cháy",
            "data": result
        })

    return {
        "success": True,
        "danger": danger,
        "message": "Phát hiện nguy cơ cháy" if danger else "An toàn",
        "data": result
    }