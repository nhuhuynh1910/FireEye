# -*- coding: utf-8 -*-
import os

# Hàm nạp file .env thủ công không cần thư viện ngoài
def load_dotenv(dotenv_path=".env"):
    if os.path.exists(dotenv_path):
        try:
            with open(dotenv_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    parts = line.split("=", 1)
                    if len(parts) == 2:
                        key = parts[0].strip()
                        val = parts[1].strip().strip('"').strip("'")
                        os.environ[key] = val
        except Exception as e:
            print(f"Error loading .env file: {e}")

# Quét qua các vị trí có thể có của file .env
current_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_candidates = [
    ".env",
    "../.env",
    os.path.join(current_dir, "../.env"),
    os.path.join(current_dir, "../../.env")
]
for cand in dotenv_candidates:
    load_dotenv(cand)

SERVER_HOST = "0.0.0.0"
SERVER_PORT = 8000
DEBUG = True

# Camera Dahua LAN
CAMERA_IP = os.getenv("CAMERA_IP", "192.168.1.108")
CAMERA_USERNAME = os.getenv("CAMERA_USERNAME", "admin")   
CAMERA_PASSWORD = os.getenv("CAMERA_PASSWORD", "L2D710CD")

CAMERA_RTSP_URL = (
    f"rtsp://{CAMERA_USERNAME}:{CAMERA_PASSWORD}"
    f"@{CAMERA_IP}:554/cam/realmonitor?channel=1&subtype=0"
)

DAHUA_BASE_URL = f"http://{CAMERA_IP}"
PTZ_CHANNEL = 1

# MQTT Broker chạy trên Raspberry Pi
MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
try:
    MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
except ValueError:
    MQTT_PORT = 1883
MQTT_USERNAME = os.getenv("MQTT_USERNAME", "fireeye")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "fireeye_password")

MQTT_SENSOR_TOPIC = "fireeye/sensor/#"
MQTT_ALERT_TOPIC = "fireeye/alert"
MQTT_CONTROL_TOPIC = "fireeye/control/sprinkler"    
# ==========================
# CAMERA ZONE CONFIG
# ==========================

HOME_PRESET = 5

ZONE_CONFIG = {
    1: {"name": "Zone 1", "pan_angle": -45, "tilt_angle": 0, "preset": 1},
    2: {"name": "Zone 2", "pan_angle": 45, "tilt_angle": 0, "preset": 2},
    3: {"name": "Zone 3", "pan_angle": 135, "tilt_angle": 0, "preset": 4},
    4: {"name": "Zone 4", "pan_angle": -135, "tilt_angle": 0, "preset": 3}
}

# ==========================
# MQTT ESP32 TOPIC CONFIG
# ==========================

ESP32_SENSOR_TOPIC_TO_ZONE = {
    "esp32c3_1/sensor": 1,
    "esp32c3_2/sensor": 2,
    "esp32c3_3/sensor": 3,
    "esp32c3_4/sensor": 4,
}

GAS_THRESHOLD = 800
TEMP_THRESHOLD = 50.0

# Cấu hình xoay camera vật lý (0, 90, 180, 270)
try:
    CAMERA_PHYSICAL_ROTATION = int(os.getenv("CAMERA_PHYSICAL_ROTATION", "0"))
except ValueError:
    CAMERA_PHYSICAL_ROTATION = 0

SYSTEM_SECRET_KEY = os.getenv("SYSTEM_SECRET_KEY", "default_server_secret_key_123456")