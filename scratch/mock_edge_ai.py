# -*- coding: utf-8 -*-
import json
import time
import paho.mqtt.client as mqtt

MQTT_BROKER = "127.0.0.1"
MQTT_PORT = 1883
BLACKLIST_TOPIC = "fireeye/edge/face-blacklist"
ALERT_TOPIC = "fireeye/alert"

# Giả lập bộ nhớ đệm (Cache) khuôn mặt đã đăng ký trên Edge AI Box
FACE_EMBEDDING_CACHE = {
    "admin": [0.12, -0.45, 0.78, 0.05],
    "nhanvien_a": [0.09, 0.22, -0.11, 0.88],
    "nhanvien_b": [-0.34, 0.51, 0.29, -0.07]
}

print("=" * 60)
print("FIREEYE - EDGE AI BOX FACE DETECTOR SIMULATOR")
print("=" * 60)
print(f"Danh sách khuôn mặt trong Cache hiện tại: {list(FACE_EMBEDDING_CACHE.keys())}")
print(f"Đang kết nối MQTT Broker {MQTT_BROKER}:{MQTT_PORT}...")

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Đã kết nối MQTT Broker thành công!")
        client.subscribe(BLACKLIST_TOPIC)
        print(f"Đã subscribe vào topic: {BLACKLIST_TOPIC}")
    else:
        print(f"Kết nối thất bại, mã lỗi: {rc}")

def on_message(client, userdata, msg):
    topic = msg.topic
    payload_str = msg.payload.decode("utf-8")
    
    try:
        data = json.loads(payload_str)
        username = data.get("username")
        action = data.get("action")
        
        if topic == BLACKLIST_TOPIC and action == "BLOCK_FACE":
            print("\n" + "!" * 50)
            print(f"[NHẬN LỆNH BLACKLIST] Khoá tài khoản: {username}")
            
            # Xoá vector khuôn mặt của user khỏi cache để mô hình AI ko nhận dạng được nữa
            if username in FACE_EMBEDDING_CACHE:
                del FACE_EMBEDDING_CACHE[username]
                print(f"--> [Edge AI] Đã xoá hoàn toàn vector khuôn mặt của '{username}' khỏi cache bộ nhớ đệm.")
                print(f"--> Danh sách Cache khuôn mặt còn lại: {list(FACE_EMBEDDING_CACHE.keys())}")
            else:
                print(f"--> User '{username}' không tồn tại trong cache hoặc đã bị xoá trước đó.")
            print("!" * 50 + "\n")
            
    except Exception as e:
        print(f"Lỗi xử lý bản tin MQTT: {e}")

def main():
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
    except Exception as e:
        print(f"Không thể kết nối đến MQTT Broker: {e}")
        print("Mẹo: Hãy chắc chắn rằng bạn đã khởi chạy MQTT Broker (như Mosquitto) trên máy tính.")
        return

    # Chạy vòng lặp MQTT không đồng bộ
    client.loop_start()
    
    try:
        # Vòng lặp chính giả lập camera quét khuôn mặt
        print("\nEdge AI Box đang chạy giả lập quét Camera...")
        while True:
            time.sleep(5)
            # Giả lập quét thấy khuôn mặt ngẫu nhiên
            for mock_user in ["nhanvien_a", "stranger_x"]:
                print(f"[Camera Scan] Phát hiện đối tượng xuất hiện...")
                time.sleep(1)
                
                if mock_user in FACE_EMBEDDING_CACHE:
                    print(f"--> Nhận dạng thành công nhân viên: '{mock_user}' (Trạng thái: An toàn)\n")
                else:
                    # Nếu không có trong cache, AI Box coi là NGƯỜI LẠ (Stranger)
                    print(f"--> [CẢNH BÁO ĐỘT NHẬP] Đối tượng là NGƯỜI LẠ (Stranger) hoặc tài khoản BỊ KHOÁ!")
                    # Giả lập bắn cảnh báo đột nhập lên Backend
                    alert_payload = {
                        "type": "INTRUSION_ALERT",
                        "details": f"Phát hiện đối tượng không xác định tại khu vực giám sát.",
                        "timestamp": time.time()
                    }
                    client.publish(ALERT_TOPIC, json.dumps(alert_payload))
                    print(f"--> Gửi bản tin cảnh báo đột nhập tới topic: {ALERT_TOPIC}\n")
                
                time.sleep(4)
                
    except KeyboardInterrupt:
        print("\nĐang dừng Edge AI Box Simulator...")
    finally:
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    main()
