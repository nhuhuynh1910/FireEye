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
        # Throttles camera checks to at most once every 15 seconds to prevent spamming Dahua RTSP
        if now - self._last_check_time < 15.0:
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
        """
        Gửi lệnh CGI điều khiển PTZ tới camera Dahua LAN qua HTTP.
        """
        url = (
            f"{self.base_url}/cgi-bin/ptz.cgi?"
            f"action={action}&code={code}&channel={self.channel}&arg1=0&arg2={speed}&arg3=0"
        )
        try:
            # Gửi HTTP request sử dụng requests DigestAuth
            response = requests.get(url, auth=self.auth, timeout=2)
            if response.status_code == 200:
                result = response.text
                return "OK" in result or "ok" in result.lower()
            else:
                print(f"Lỗi gửi lệnh PTZ tới Dahua ({code}): HTTP {response.status_code}")
                return False
        except Exception as e:
            print(f"Lỗi gửi lệnh PTZ tới Dahua ({code}): {e}")
            return False

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

    def stop(self, code="Left"):
        # Map mã code chữ thường từ FE sang mã điều khiển CGI của Dahua
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


camera_service = CameraService()