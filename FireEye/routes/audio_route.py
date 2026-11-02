# -*- coding: utf-8 -*-
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from services.audio_service import audio_service

router = APIRouter(
    prefix="/api/audio",
    tags=["Audio / Speaker Control"]
)


class AlarmControlRequest(BaseModel):
    duration: Optional[float] = 10.0


class VolumeControlRequest(BaseModel):
    volume: float  # 0.0 to 1.0


@router.get("/status")
def get_audio_status():
    """Get current speaker status, active alarm state, and volume."""
    return audio_service.get_status()


@router.post("/test")
def test_speaker():
    """Play a short test beep on the Raspberry Pi speaker."""
    success = audio_service.play_test_tone()
    return {
        "success": success,
        "message": "Đã phát âm thanh thử nghiệm ra loa" if success else "Không thể phát âm thanh"
    }


@router.post("/alarm/start")
def start_alarm(req: AlarmControlRequest = AlarmControlRequest()):
    """Manually trigger the fire alarm siren for a given duration (seconds)."""
    success = audio_service.start_alarm(duration=req.duration or 10.0)
    return {
        "success": success,
        "duration": req.duration,
        "message": "Đã kích hoạt còi hú báo cháy trên loa Pi 5" if success else "Không thể kích hoạt còi"
    }


@router.post("/alarm/stop")
def stop_alarm():
    """Immediately stop any active alarm siren on the speaker."""
    success = audio_service.stop_alarm()
    return {
        "success": success,
        "message": "Đã tắt còi hú báo cháy trên loa Pi 5"
    }


@router.post("/volume")
def set_speaker_volume(req: VolumeControlRequest):
    """Set speaker output volume (0.0 to 1.0)."""
    success = audio_service.set_volume(req.volume)
    return {
        "success": success,
        "volume": req.volume,
        "message": f"Đã chỉnh âm lượng lên {int(req.volume * 100)}%" if success else "Không thể chỉnh âm lượng"
    }

