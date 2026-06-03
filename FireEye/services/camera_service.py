import cv2
import requests
import time
import threading
from requests.auth import HTTPDigestAuth

from config.settings import (
    CAMERA_RTSP_URL,
    DAHUA_BASE_URL,
    CAMERA_USERNAME,
    CAMERA_PASSWORD,
    PTZ_CHANNEL,
    ZONE_CONFIG,
    HOME_PRESET,
    CAMERA_PHYSICAL_ROTATION
)


class VideoGrabber:
    def __init__(self, rtsp_url):
        self.rtsp_url = rtsp_url
        self.cap = None
        self.frame = None
        self.ret = False
        self.running = False
        self.lock = threading.Lock()
        self.thread = None
        self.last_frame_time = 0.0

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._grab_loop, name="VideoGrabberThread", daemon=True)
        self.thread.start()
        print("VideoGrabber thread started.")

    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=2.0)
        if self.cap:
            self.cap.release()
            self.cap = None
        print("VideoGrabber thread stopped.")

    def _grab_loop(self):
        while self.running:
            if self.cap is None or not self.cap.isOpened():
                if self.cap:
                    self.cap.release()
                print(f"Connecting to RTSP: {self.rtsp_url}")
                self.cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
                self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                if not self.cap.isOpened():
                    print("Failed to open camera stream. Retrying in 3 seconds...")
                    time.sleep(3)
                    continue
                print("Camera stream connected successfully.")

            # Read frame
            ret, frame = self.cap.read()
            if not ret:
                print("Failed to read frame from camera stream. Reconnecting...")
                self.cap.release()
                self.cap = None
                time.sleep(1)
                continue

            if frame is not None and CAMERA_PHYSICAL_ROTATION != 0:
                if CAMERA_PHYSICAL_ROTATION == 90:
                    frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
                elif CAMERA_PHYSICAL_ROTATION == 180:
                    frame = cv2.rotate(frame, cv2.ROTATE_180)
                elif CAMERA_PHYSICAL_ROTATION == 270:
                    frame = cv2.rotate(frame, cv2.ROTATE_90_COUNTERCLOCKWISE)

            with self.lock:
                self.ret = ret
                self.frame = frame
                self.last_frame_time = time.time()

            # Yield CPU to other threads (prevents 100% CPU loop)
            time.sleep(0.01)

    def get_latest_frame(self):
        with self.lock:
            if self.ret and self.frame is not None:
                # Trả về bản sao của frame để tránh xung đột đọc/ghi đồng thời
                return True, self.frame.copy()
            return False, None

    def is_online(self):
        with self.lock:
            # Nếu nhận được frame trong vòng 10 giây qua, coi như online
            return self.ret and (time.time() - self.last_frame_time < 10.0)


class CameraService:
    def __init__(self):
        self.camera_url = CAMERA_RTSP_URL
        self.base_url = DAHUA_BASE_URL
        self.username = CAMERA_USERNAME
        self.password = CAMERA_PASSWORD
        self.channel = PTZ_CHANNEL
        self.auth = HTTPDigestAuth(self.username, self.password)
        
        # Khởi tạo đối tượng luồng đọc camera ngầm
        self.grabber = VideoGrabber(self.camera_url)

    def start_grabber(self):
        self.grabber.start()

    def stop_grabber(self):
        self.grabber.stop()

    def get_latest_frame(self):
        return self.grabber.get_latest_frame()

    def check_camera(self):
        # Trả về trạng thái từ grabber ngay lập tức (không block uvicorn thread)
        return self.grabber.is_online()

    def get_capture(self):
        # Để đảm bảo tương thích ngược nếu các script cũ cần VideoCapture trực tiếp
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

    def goto_preset(self, preset_id):
        # API PTZ Dahua: action=locate&code=Preset&arg1=0&arg2=preset_id&arg3=0
        # Tốc độ ở đây được truyền vào arg2, nên truyền preset_id làm speed.
        return self._send_ptz_command("locate", "Preset", preset_id)

    def go_home(self):
        # Sử dụng Preset Home (Preset 5) nếu thành công
        ok = self.goto_preset(HOME_PRESET)
        if ok:
            return {
                "success": True,
                "action": "home_preset",
                "preset_id": HOME_PRESET,
                "mode": "preset"
            }

        # Fallback về timed timed movement nếu thất bại
        print("Gọi preset Home thất bại, quay về phương thức timed movement.")
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
            "mode": "manual_timed_move_fallback",
            "moves": results
        }

    def goto_zone(self, zone_id):
        # Thử tìm và di chuyển bằng PTZ Preset trước để tránh drift và không block luồng
        zone_info = ZONE_CONFIG.get(zone_id)
        if zone_info and "preset" in zone_info:
            preset_id = zone_info["preset"]
            ok = self.goto_preset(preset_id)
            if ok:
                return {
                    "success": True,
                    "zone_id": zone_id,
                    "preset_id": preset_id,
                    "mode": "preset"
                }

        # Fallback về timed movement nếu không cấu hình preset hoặc gọi lỗi
        print(f"Bỏ qua Preset của zone {zone_id}, rơi về timed movement.")
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
            "mode": "manual_timed_move_fallback",
            "moves": results
        }


camera_service = CameraService()