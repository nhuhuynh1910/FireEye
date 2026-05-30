# -*- coding: utf-8 -*-
import os

SERVER_HOST = "0.0.0.0"
SERVER_PORT = 8000
DEBUG = True

# Camera Dahua LAN
CAMERA_IP = "192.168.1.108"
CAMERA_USERNAME = "admin"
CAMERA_PASSWORD = "L2D710CD"

CAMERA_RTSP_URL = (
    f"rtsp://{CAMERA_USERNAME}:{CAMERA_PASSWORD}"
    f"@{CAMERA_IP}:554/cam/realmonitor?channel=1&subtype=0"
)

DAHUA_BASE_URL = f"http://{CAMERA_IP}"
PTZ_CHANNEL = 1

# MQTT Broker chạy trên Raspberry Pi
MQTT_BROKER = "localhost"
MQTT_PORT = 1883
MQTT_USERNAME = os.getenv("MQTT_USERNAME", "fireeye")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "fireeye_password")

MQTT_SENSOR_TOPIC = "fireeye/sensor/#"
MQTT_ALERT_TOPIC = "fireeye/alert"
MQTT_CONTROL_TOPIC = "fireeye/control/sprinkler"    