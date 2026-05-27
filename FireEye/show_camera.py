import cv2

# Đường dẫn luồng RTSP của camera Dahua
rtsp_url = "rtsp://admin:L2D710CD@192.168.1.108:554/cam/realmonitor?channel=1&subtype=0"

print("Đang kết nối tới Camera Dahua...")
cap = cv2.VideoCapture(rtsp_url)

if not cap.isOpened():
    print("Lỗi: Không thể mở luồng video. Vui lòng kiểm tra lại kết nối LAN.")
    exit(1)

print("Kết nối thành công! Đang hiển thị video...")
print("-> Nhấn phím 'q' trên bàn phím khi đang chọn cửa sổ video để ĐÓNG.")

# Tạo cửa sổ hiển thị có thể điều chỉnh kích thước
cv2.namedWindow("Dahua Camera Live", cv2.WINDOW_NORMAL)
cv2.resizeWindow("Dahua Camera Live", 960, 540)

while True:
    ret, frame = cap.read()
    if not ret:
        print("Lỗi: Mất kết nối luồng video.")
        break
    
    # Hiển thị frame lên cửa sổ
    cv2.imshow("Dahua Camera Live", frame)
    
    # Chờ 1ms và kiểm tra nếu nhấn phím 'q'
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
print("Đã đóng cửa sổ hiển thị video.")
