import cv2
from config.settings import CAMERA_SOURCE


class CameraService:
    def __init__(self):
        self.camera_source = CAMERA_SOURCE

    def check_camera(self):
        cap = cv2.VideoCapture(self.camera_source)

        if not cap.isOpened():
            cap.release()
            return False

        ret, frame = cap.read()
        cap.release()

        return ret

    def get_capture(self):
        return cv2.VideoCapture(self.camera_source)


camera_service = CameraService()