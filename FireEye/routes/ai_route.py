from fastapi import APIRouter
from pydantic import BaseModel

from services.hailo_service import hailo_service
from services.mqtt_service import mqtt_service
from services.snapshot_service import capture_snapshot
from services.db_service import insert_event

from data.state import (
    get_ai_state,
    update_ai_detection
)

router = APIRouter()


class AiDetectRequest(BaseModel):
    fire: bool = False
    smoke: bool = False
    human: bool = False
    confidence: float = 0.0
    bbox: list[int] | None = None


def calculate_risk_level(fire: bool, smoke: bool, human: bool) -> str:
    if fire and smoke and human:
        return "EMERGENCY"
    if fire and human:
        return "CRITICAL"
    if fire and smoke:
        return "HIGH"
    if fire:
        return "HIGH"
    if smoke:
        return "MEDIUM"
    if human:
        return "LOW"
    return "SAFE"


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
        confidence=data.confidence,
        bbox=data.bbox
    )

    danger = data.fire or data.smoke

    event_type = None

    if data.fire:
        event_type = "FIRE"
    elif data.smoke:
        event_type = "SMOKE"
    elif data.human:
        event_type = "HUMAN"

    risk_level = calculate_risk_level(
        fire=data.fire,
        smoke=data.smoke,
        human=data.human
    )

    snapshot_path = None
    event_id = None

    if event_type:
        snapshot_path = capture_snapshot(event_type)

        message = f"AI phát hiện {event_type} - mức độ {risk_level}"

        event_id = insert_event(
            event_type=event_type,
            source="AI",
            risk_level=risk_level,
            confidence=data.confidence,
            message=message,
            snapshot_path=snapshot_path
        )

    if danger:
        mqtt_service.publish_alert({
            "source": "ai",
            "event_type": event_type,
            "risk_level": risk_level,
            "message": "AI phát hiện nguy cơ cháy",
            "snapshot": snapshot_path,
            "data": result
        })

    return {
        "success": True,
        "danger": danger,
        "event_id": event_id,
        "event_type": event_type,
        "risk_level": risk_level,
        "snapshot": snapshot_path,
        "message": "Phát hiện nguy cơ cháy" if danger else "An toàn",
        "data": result
    }