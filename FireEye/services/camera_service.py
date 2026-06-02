import cv2
import requests
import time
from requests.auth import HTTPDigestAuth

from config.settings import (
    CAMERA_RTSP_URL,
    DAHUA_BASE_URL,
    CAMERA_USERNAME,
    CAMERA_PASSWORD,
    PTZ_CHANNEL
)


class CameraService:
    def __init__(self):
        self.camera_url = CAMERA_RTSP_URL
        self.base_url = DAHUA_BASE_URL
        self.username = CAMERA_USERNAME
        self.password = CAMERA_PASSWORD
        self.channel = PTZ_CHANNEL
        self.auth = HTTPDigestAuth(self.username, self.password)
        self._last_check_time = 0.0
        self._last_online_status = False

    def check_camera(self):
        now = time.time()

        if now - self._last_check_time < 15:
            return self._last_online_status

        cap = cv2.VideoCapture(self.camera_url, cv2.CAP_FFMPEG)

        if not cap.isOpened():
            cap.release()
            self._last_online_status = False
            self._last_check_time = now
            return False

        ret, frame = cap.read()
        cap.release()

        self._last_online_status = bool(ret)
        self._last_check_time = now
        return self._last_online_status

    def get_capture(self):
        return cv2.VideoCapture(self.camera_url, cv2.CAP_FFMPEG)

    def _send_ptz_command(self, action, code, speed=4):
        url = (
            f"{self.base_url}/cgi-bin/ptz.cgi?"
            f"action={action}"
            f"&channel={self.channel}"
            f"&code={code}"
            f"&arg1=0"
            f"&arg2={speed}"
            f"&arg3=0"
        )

        try:
            response = requests.get(
                url,
                auth=self.auth,
                timeout=3
            )

            print("PTZ URL:", url)
            print("PTZ STATUS:", response.status_code)
            print("PTZ RESPONSE:", response.text)

            if response.status_code == 200:
                result = response.text.strip()
                return "OK" in result or "ok" in result.lower()

            return False

        except Exception as e:
            print(f"Lỗi PTZ {code}: {e}")
            return False

    def _move_for_seconds(self, code, duration=1.0, speed=4):
        start_ok = self._send_ptz_command("start", code, speed)
        time.sleep(duration)
        stop_ok = self._send_ptz_command("stop", code, 0)
        return start_ok and stop_ok

    def move_left(self, speed=4):
        return self._send_ptz_command("start", "Left", speed)

    def move_right(self, speed=4):
        return self._send_ptz_command("start", "Right", speed)

    def move_up(self, speed=4):
        return self._send_ptz_command("start", "Up", speed)

    def move_down(self, speed=4):
        return self._send_ptz_command("start", "Down", speed)

    def zoom_in(self, speed=4):
        return self._send_ptz_command("start", "ZoomTele", speed)

    def zoom_out(self, speed=4):
        return self._send_ptz_command("start", "ZoomWide", speed)

    def stop(self, code="left"):
        mapping = {
            "left": "Left",
            "right": "Right",
            "up": "Up",
            "down": "Down",
            "zoom-in": "ZoomTele",
            "zoom-out": "ZoomWide"
        }

        ptz_code = mapping.get(code.lower(), "Left")
        return self._send_ptz_command("stop", ptz_code, 0)

    def go_home(self):
        results = []

        ok1 = self._move_for_seconds(
            code="Right",
            duration=1.0,
            speed=4
        )

        results.append({
            "code": "Right",
            "duration": 1.0,
            "success": ok1
        })

        ok2 = self._move_for_seconds(
            code="Down",
            duration=0.5,
            speed=4
        )

        results.append({
            "code": "Down",
            "duration": 0.5,
            "success": ok2
        })

        return {
            "success": all(item["success"] for item in results),
            "action": "home_manual",
            "mode": "manual_timed_move",
            "moves": results
        }

    def goto_zone(self, zone_id):
        zone_moves = {
            1: [
                ("Left", 1.0),
                ("Up", 0.5)
            ],
            2: [
                ("Right", 1.0),
                ("Up", 0.5)
            ],
            3: [
                ("Left", 1.0),
                ("Down", 0.5)
            ],
            4: [
                ("Right", 1.0),
                ("Down", 0.5)
            ]
        }

        zone_angles = {
            1: -45,
            2: 45,
            3: -135,
            4: 135
        }

        moves = zone_moves.get(zone_id)

        if not moves:
            return {
                "success": False,
                "message": "Zone không hợp lệ",
                "zone_id": zone_id
            }

        results = []

        for code, duration in moves:
            ok = self._move_for_seconds(
                code=code,
                duration=duration,
                speed=4
            )

            results.append({
                "code": code,
                "duration": duration,
                "success": ok
            })

        return {
            "success": all(item["success"] for item in results),
            "zone_id": zone_id,
            "pan_angle": zone_angles[zone_id],
            "mode": "manual_timed_move",
            "moves": results
        }


camera_service = CameraService()