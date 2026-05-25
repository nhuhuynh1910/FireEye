# config/settings.py
# -*- coding: utf-8 -*-

SERVER_HOST = "0.0.0.0"
SERVER_PORT = 5000
DEBUG = True

# Camera Dahua LAN
CAMERA_IP = "192.168.1.108"
CAMERA_USERNAME = "admin"
CAMERA_PASSWORD = "L2D710CD"

# Dahua RTSP
CAMERA_RTSP_URL = (
    f"rtsp://{CAMERA_USERNAME}:{CAMERA_PASSWORD}"
    f"@{CAMERA_IP}:554/cam/realmonitor?channel=1&subtype=0"
)

# Dahua PTZ / HTTP control
DAHUA_BASE_URL = f"http://{CAMERA_IP}"
PTZ_CHANNEL = 1