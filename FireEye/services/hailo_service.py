# services/hailo_service.py
from datetime import datetime
from data.state import get_ai_state

class HailoService:
    def __init__(self):
        self.device = "Hailo 8L"

    def get_status(self):
        ai = get_ai_state()
        last_updated = ai.get("lastUpdated")
        status = "standby"
        message = "Hailo 8L AI worker is offline or standby"

        if last_updated:
            try:
                dt = datetime.strptime(last_updated, "%Y-%m-%d %H:%M:%S")
                diff = (datetime.now() - dt).total_seconds()
                if diff <= 6.0:
                    status = "active"
                    message = "Hailo 8L AI worker is running and detecting"
            except Exception:
                pass

        return {
            "device": self.device,
            "status": status,
            "message": message
        }


hailo_service = HailoService()