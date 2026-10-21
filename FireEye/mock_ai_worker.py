# -*- coding: utf-8 -*-
import time
import cv2
import requests
import sys
import select
import os

# Manual dotenv loader matching settings.py
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

load_dotenv()

CAMERA_IP = os.getenv("CAMERA_IP", "192.168.1.108")
CAMERA_USERNAME = os.getenv("CAMERA_USERNAME", "admin")   
CAMERA_PASSWORD = os.getenv("CAMERA_PASSWORD", "L2D710CD")
RTSP_URL = f"rtsp://{CAMERA_USERNAME}:{CAMERA_PASSWORD}@{CAMERA_IP}:554/cam/realmonitor?channel=1&subtype=0"
API_URL = "http://127.0.0.1:8000/api/ai/detect"

print("=" * 60)
print("FIREEYE MOCK AI WORKER - CAMERA LAN EMULATOR")
print("=" * 60)
print(f"Camera RTSP Source: {RTSP_URL}")
print(f"Target Backend API: {API_URL}")
print("Press following keys in terminal to inject simulation alerts:")
print("  [f] -> Inject FIRE alert")
print("  [s] -> Inject SMOKE alert")
print("  [h] -> Inject HUMAN alert")
print("  [c] -> Clear alerts (SAFE state)")
print("  [q] -> Quit mock worker")
print("=" * 60)

def post_ai_result(payload):
    try:
        r = requests.post(API_URL, json=payload, timeout=0.5)
        print(f"POST -> Status: {r.status_code}, Response: {r.json()}")
    except Exception as e:
        print(f"POST Connection Error: {e}")

def main():
    cap = cv2.VideoCapture(RTSP_URL, cv2.CAP_FFMPEG)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    if not cap.isOpened():
        print(f"WARNING: Cannot connect to Dahua RTSP LAN at {CAMERA_IP}.")
        print("We will run in frame-less simulator mode. (Payloads will still be sent)")
    else:
        print("Connected to Dahua LAN Camera successfully!")

    current_class = "safe"
    bbox = None
    confidence = 0.0

    print("\nRunning... (Listening for keyboard inputs)")
    
    # Non-blocking terminal input helper for Unix/Linux
    import tty
    import termios

    orig_settings = termios.tcgetattr(sys.stdin)
    try:
        tty.setcbreak(sys.stdin.fileno())
        
        last_send_time = 0
        
        while True:
            # Read frame to keep stream active
            if cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    print("Failed to read frame from LAN. Retrying connection...")
                    cap.release()
                    time.sleep(2)
                    cap.open(RTSP_URL, cv2.CAP_FFMPEG)
                    continue

            # Check keyboard input (non-blocking)
            if select.select([sys.stdin], [], [], 0.02)[0] == [sys.stdin]:
                char = sys.stdin.read(1).lower()
                if char == 'f':
                    current_class = "fire"
                    confidence = 0.85
                    bbox = [200, 150, 450, 380]
                    print("\n[KEYTRIGGER] Simulating FIRE target detected!")
                elif char == 's':
                    current_class = "smoke"
                    confidence = 0.75
                    bbox = [100, 80, 600, 300]
                    print("\n[KEYTRIGGER] Simulating SMOKE target detected!")
                elif char == 'h':
                    current_class = "human"
                    confidence = 0.92
                    bbox = [300, 100, 500, 450]
                    print("\n[KEYTRIGGER] Simulating HUMAN target detected!")
                elif char == 'c':
                    current_class = "safe"
                    confidence = 0.0
                    bbox = None
                    print("\n[KEYTRIGGER] Cleared alerts. Safe state.")
                elif char == 'q':
                    print("\nExiting Mock AI Worker...")
                    break

            # Send state periodically every 2 seconds
            now = time.time()
            if now - last_send_time >= 2.0:
                payload = {
                    "fire": current_class == "fire",
                    "smoke": current_class == "smoke",
                    "human": current_class == "human",
                    "confidence": confidence,
                    "bbox": bbox
                }
                post_ai_result(payload)
                last_send_time = now

            time.sleep(0.05)

    finally:
        termios.tcsetattr(sys.stdin, termios.TCSADRAIN, orig_settings)
        if cap.isOpened():
            cap.release()

if __name__ == "__main__":
    main()
