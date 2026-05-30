/*
 * ESP32 MQTT Client for FireEye
 * 
 * This sketch connects an ESP32 to the WiFi and the FireEye MQTT Broker on Raspberry Pi.
 * It reads data from a smoke sensor (e.g., MQ-2) and a flame sensor, then publishes the
 * data to the topic 'fireeye/sensor/esp32_node'.
 * It also subscribes to 'fireeye/control/sprinkler' to control a sprinkler relay.
 * 
 * Required libraries:
 * - PubSubClient (by Nick O'Leary)
 * - ArduinoJson (by Benoit Blanchon)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// --- Cấu hình WiFi ---
const char* ssid = "TEN_WIFI_CUA_BAN";
const char* password = "MAT_KHAU_WIFI";

// --- Cấu hình MQTT Broker (Raspberry Pi) ---
// Thay thế bằng địa chỉ IP của Raspberry Pi chạy FireEye (ví dụ: "192.168.1.100")
// Bạn có thể xem IP của Pi bằng lệnh `hostname -I` trên terminal của Pi.
const char* mqtt_broker = "192.168.1.100"; 
const int mqtt_port = 1883;
const char* mqtt_username = "fireeye";      // Tên đăng nhập MQTT
const char* mqtt_password = "fireeye_password"; // Mật khẩu MQTT

// --- Định nghĩa các Topic ---
const char* topic_sensor = "fireeye/sensor/esp32_node";
const char* topic_control = "fireeye/control/sprinkler";

// --- Định nghĩa chân PIN ---
#define SMOKE_PIN 34     // Chân Analog đọc giá trị cảm biến khói (MQ-2)
#define FLAME_PIN 35     // Chân Analog đọc giá trị cảm biến lửa (hoặc Digital tùy loại cảm biến)
#define SPRINKLER_PIN 12 // Chân điều khiển Relay kích hoạt vòi phun nước

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastMsgTime = 0;
const unsigned long publishInterval = 5000; // Gửi dữ liệu mỗi 5 giây

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Dang ket noi WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi da ket noi!");
  Serial.print("Dia chi IP cua ESP32: ");
  Serial.println(WiFi.localIP());
}

// Hàm callback nhận dữ liệu điều khiển từ MQTT Broker
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Nhan duoc tin nhan tu topic: ");
  Serial.println(topic);

  // Chuyển đổi payload thành chuỗi
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.print("Payload: ");
  Serial.println(message);

  // Phân tích cú pháp JSON nhận được
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.print("Loi phan tich JSON: ");
    Serial.println(error.c_str());
    return;
  }

  // So khớp topic điều khiển vòi phun
  if (strcmp(topic, topic_control) == 0) {
    const char* action = doc["action"];
    if (action != NULL) {
      if (strcmp(action, "ON") == 0) {
        Serial.println("KICH HOAT VOI PHUN (Relay ON)");
        digitalWrite(SPRINKLER_PIN, HIGH); // Hoặc LOW tùy loại Relay kích ở mức nào
      } else if (strcmp(action, "OFF") == 0) {
        Serial.println("TAT VOI PHUN (Relay OFF)");
        digitalWrite(SPRINKLER_PIN, LOW);  // Hoặc HIGH tùy loại Relay
      }
    }
  }
}

// Hàm kết nối lại với MQTT Broker
void reconnect() {
  while (!client.connected()) {
    Serial.print("Dang ket noi den MQTT Broker...");
    // Khởi tạo Client ID ngẫu nhiên
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);

    // Kết nối sử dụng username/password nếu có
    bool connected = false;
    if (strlen(mqtt_username) > 0) {
      connected = client.connect(clientId.c_str(), mqtt_username, mqtt_password);
    } else {
      connected = client.connect(clientId.c_str());
    }

    if (connected) {
      Serial.println("Da ket noi MQTT!");
      // Đăng ký nhận lệnh điều khiển
      client.subscribe(topic_control);
      Serial.print("Da subscribe topic: ");
      Serial.println(topic_control);
    } else {
      Serial.print("Loi ket noi, rc=");
      Serial.print(client.state());
      Serial.println(" - Thu lai sau 5 giay");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  
  // Thiết lập chân vào/ra
  pinMode(SMOKE_PIN, INPUT);
  pinMode(FLAME_PIN, INPUT);
  pinMode(SPRINKLER_PIN, OUTPUT);
  digitalWrite(SPRINKLER_PIN, LOW); // Đảm bảo ban đầu vòi phun tắt

  setup_wifi();
  
  client.setServer(mqtt_broker, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long now = millis();
  if (now - lastMsgTime > publishInterval) {
    lastMsgTime = now;

    // --- Đọc cảm biến ---
    int smokeVal = analogRead(SMOKE_PIN);
    int flameVal = analogRead(FLAME_PIN);

    // Xác định ngưỡng phát hiện cháy/khói (Ví dụ ngưỡng giả định, bạn có thể điều chỉnh)
    bool smokeDetected = (smokeVal > 1500); // Ngưỡng cảm biến khói MQ-2
    bool flameDetected = (flameVal < 1000);  // Thường cảm biến lửa trả về mức thấp (LOW) khi có lửa

    // --- Tạo Payload JSON ---
    StaticJsonDocument<256> doc;
    doc["node"] = "esp32_node";
    doc["smokeDetected"] = smokeDetected;
    doc["flameDetected"] = flameDetected;
    doc["smokeValue"] = smokeVal;
    doc["flameValue"] = flameVal;

    char buffer[256];
    serializeJson(doc, buffer);

    // --- Publish dữ liệu ---
    Serial.print("Gui tin nhan: ");
    Serial.println(buffer);
    client.publish(topic_sensor, buffer);
  }
}
