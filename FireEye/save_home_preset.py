# -*- coding: utf-8 -*-
"""
Script helper to save the current camera position as Preset 5 (Home Position).
Rotate the camera to your desired 90-degree angle using the dashboard PTZ controls,
then run this script.
"""
import requests
from requests.auth import HTTPDigestAuth
import os

# Manual load of .env
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
                        os.environ[parts[0].strip()] = parts[1].strip().strip('"').strip("'")
        except Exception as e:
            print(f"Error loading .env file: {e}")

load_dotenv()

CAMERA_IP = os.getenv("CAMERA_IP", "192.168.1.108")
CAMERA_USERNAME = os.getenv("CAMERA_USERNAME", "admin")
CAMERA_PASSWORD = os.getenv("CAMERA_PASSWORD", "L2D710CD")

base_url = f"http://{CAMERA_IP}"
auth = HTTPDigestAuth(CAMERA_USERNAME, CAMERA_PASSWORD)

# Preset 5 is configured as HOME_PRESET
preset_id = 5
channel = 1

url = f"{base_url}/cgi-bin/ptz.cgi?action=start&channel={channel}&code=SetPreset&arg1=0&arg2={preset_id}&arg3=0"

print(f"Saving current camera position as Preset {preset_id}...")
print("Calling API:", url)

try:
    response = requests.get(url, auth=auth, timeout=5)
    print("STATUS CODE:", response.status_code)
    print("RESPONSE BODY:", response.text)
    if response.status_code == 200 and ("OK" in response.text or "ok" in response.text.lower()):
        print("\n🎉 THÀNH CÔNG: Vị trí hiện tại của camera đã được lưu làm Preset 5 (Home Position)!")
        print("Mỗi khi bấm nút Home trên giao diện, camera sẽ reboot tự hiệu chuẩn và tự động quay về góc này.")
    else:
        print("\n❌ THẤT BẠI: Camera trả về lỗi. Hãy kiểm tra kết nối mạng và tài khoản.")
except Exception as e:
    print(f"\n❌ LỖI KẾT NỐI: Không thể gửi yêu cầu đến camera: {e}")
