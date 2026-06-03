import cv2
import time
from services.camera_service import camera_service
from data.state import get_ai_state
def draw_detections(frame, detections):
    """
    Vẽ bounding boxes và labels lên khung hình thô sử dụng các hàm tối ưu của OpenCV.
    Thời gian xử lý cam kết dưới 5ms, cực kỳ nhẹ cho CPU của Raspberry Pi 5.
    """
    for det in detections:
        x1 = int(det.get("x_min", 0))
        y1 = int(det.get("y_min", 0))
        x2 = int(det.get("x_max", 0))
        y2 = int(det.get("y_max", 0))
        class_name = det.get("class_name", "").upper()
        conf = det.get("confidence", 0.0)

        # Tránh vẽ tọa độ bị rỗng
        if None in (x1, y1, x2, y2):
            continue

        # Định nghĩa màu sắc (định dạng BGR trong OpenCV)
        if "FIRE" in class_name:
            color = (0, 0, 255)       # Đỏ rực
            thickness = 3             # Độ dày lớn cho cảnh báo cháy nổ
            label_text = f"ALARM - FIRE: {int(conf * 100)}%"
        elif "SMOKE" in class_name:
            color = (0, 165, 255)     # Cam
            thickness = 2
            label_text = f"WARN - SMOKE: {int(conf * 100)}%"
        elif "HUMAN" in class_name:
            color = (255, 0, 0)       # Xanh dương (Blue)
            thickness = 2
            label_text = f"HUMAN: {int(conf * 100)}%"
        else:
            color = (0, 255, 255)     # Vàng làm mặc định
            thickness = 2
            label_text = f"{class_name}: {int(conf * 100)}%"

        # 1. Vẽ khung Bounding Box chính
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, thickness)

        # 2. Tính toán kích thước chữ để tạo background cho nhãn
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.5
        font_thickness = 1
        (w, h), baseline = cv2.getTextSize(label_text, font, font_scale, font_thickness)
        
        # Đảm bảo nhãn không bị đẩy ra ngoài mép trên khung hình
        label_y1 = max(y1 - h - 10, 0)
        label_y2 = max(y1, h + 10)

        # 3. Vẽ nhãn đặc (Solid background) làm nền chữ giúp chữ không bị chìm
        cv2.rectangle(frame, (x1, label_y1), (x1 + w + 10, label_y2), color, -1)

        # 4. Vẽ Text màu trắng đè lên nền nhãn
        cv2.putText(
            frame, 
            label_text, 
            (x1 + 5, label_y2 - 5), 
            font, 
            font_scale, 
            (255, 255, 255), 
            font_thickness, 
            cv2.LINE_AA
        )


def generate_camera_stream():
    """
    Generator tạo luồng MJPEG phát trực tiếp xuống frontend React.
    """
    while True:
        success, frame = camera_service.get_latest_frame()

        if not success:
            time.sleep(0.05)  # Tránh chiếm dụng CPU khi camera chưa kết nối
            continue

        h_orig, w_orig = frame.shape[:2]
        frame = cv2.resize(frame, (960, 540))

        # Đọc trạng thái AI hiện thời
        ai = get_ai_state()
        detections = []

        if ai.get("fireDetected") or ai.get("smokeDetected") or ai.get("humanDetected"):
            bbox = ai.get("bbox")
            
            if bbox and len(bbox) == 4:
                # Quy đổi tỉ lệ tọa độ từ ảnh gốc sang khung hình stream (960x540)
                x_scale = 960.0 / w_orig
                y_scale = 540.0 / h_orig
                x1 = int(bbox[0] * x_scale)
                y1 = int(bbox[1] * y_scale)
                x2 = int(bbox[2] * x_scale)
                y2 = int(bbox[3] * y_scale)
            else:
                # Tọa độ fallback mặc định ở giữa hình nếu không nhận được bbox cụ thể
                x1, y1, x2, y2 = 408, 218, 588, 388

            # Xác định lớp nhãn
            if ai.get("fireDetected"):
                class_name = "FIRE"
            elif ai.get("smokeDetected"):
                class_name = "SMOKE"
            else:
                class_name = "HUMAN"

            detections.append({
                "x_min": x1,
                "y_min": y1,
                "x_max": x2,
                "y_max": y2,
                "confidence": ai.get("confidence", 0.0),
                "class_name": class_name
            })

        # Gọi hàm vẽ đè thông tin cảnh báo lên frame
        if detections:
            draw_detections(frame, detections)

        # Encode sang dạng JPEG để phát luồng
        ret, buffer = cv2.imencode(".jpg", frame)
        if not ret:
            time.sleep(0.01)
            continue

        frame_bytes = buffer.tobytes()

        # Trả về frame theo cấu trúc HTTP multipart của MJPEG
        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
        )
        
        # Trì hoãn tương ứng khoảng 30 FPS
        time.sleep(0.03)