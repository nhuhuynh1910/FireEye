# services/hailo_service.py

class HailoService:
    def __init__(self):
        self.device = "Hailo 8L"
        self.status = "standby"

    def get_status(self):
        return {
            "device": self.device,
            "status": self.status,
            "message": "Hailo 8L service ready, AI detect will be added later"
        }


hailo_service = HailoService()