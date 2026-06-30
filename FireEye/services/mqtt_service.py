import json
import time
import paho.mqtt.client as mqtt

from config.settings import (
    MQTT_BROKER,
    MQTT_PORT,
    MQTT_SENSOR_TOPIC,
    MQTT_ALERT_TOPIC,
    MQTT_CONTROL_TOPIC,
    MQTT_USERNAME,
    MQTT_PASSWORD,
    ESP32_SENSOR_TOPIC_TO_ZONE,
    GAS_THRESHOLD,
    TEMP_THRESHOLD
)

from data.state import update_sensor, update_sprinkler
from services.camera_service import camera_service


ESP32_MOTOR_TOPIC_BY_ZONE = {
    1: "esp32c3_1/pump",
    2: "esp32c3_2/pump",
    3: "esp32c3_3/pump",
    4: "esp32c3_4/pump"
}


class MQTTService:
    def __init__(self):
        self.client = mqtt.Client()
        self.connected = False

        self.active_zone = None
        self.last_zone_change_time = 0.0
        self.ZONE_LOCK_DURATION = 15.0

        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message

    def start(self):
        try:
            if MQTT_USERNAME and MQTT_PASSWORD:
                self.client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

            self.client.connect(MQTT_BROKER, MQTT_PORT, 60)
            self.client.loop_start()
            print("MQTT service started")

        except Exception as e:
            print("MQTT connect error:", e)

    def stop(self):
        try:
            self.client.loop_stop()
            self.client.disconnect()
            self.connected = False
            print("MQTT service stopped")

        except Exception as e:
            print("MQTT stop error:", e)

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.connected = True
            print("MQTT connected")

            client.subscribe(MQTT_SENSOR_TOPIC)
            client.subscribe(MQTT_CONTROL_TOPIC)

            for topic in ESP32_SENSOR_TOPIC_TO_ZONE.keys():
                client.subscribe(topic)
                print("Subscribed ESP32:", topic)

            for zone in [1, 2, 3, 4]:
                client.subscribe(f"esp32c3_{zone}/data")
                print(f"Subscribed ESP32 JSON data topic: esp32c3_{zone}/data")

        else:
            self.connected = False
            print("MQTT failed, rc =", rc)

    def on_message(self, client, userdata, msg):
        topic = msg.topic
        payload = msg.payload.decode("utf-8").strip()

        print("MQTT message:", topic, payload)

        if topic.endswith("/data") and topic.startswith("esp32c3_"):
            self.handle_esp32_json_data(topic, payload)
            return

        if topic in ESP32_SENSOR_TOPIC_TO_ZONE:
            self.handle_esp32_legacy_sensor(topic, payload)
            return

        try:
            data = json.loads(payload)
        except Exception:
            print("MQTT payload không phải JSON")
            return

        if topic.startswith("fireeye/sensor/"):
            self.handle_fireeye_sensor(topic, data)

        elif topic == MQTT_CONTROL_TOPIC:
            self.handle_control_message(data)

    def handle_esp32_json_data(self, topic, payload):
        try:
            zone_id = int(topic.split("_")[1].split("/")[0])
            data = json.loads(payload)

            temp = data.get("temperature", 0.0)
            humi = data.get("humidity", 0.0)
            gas = data.get("gas", 0)  # Mặc định là 0 (an toàn)
            pump = data.get("pump", "OFF")
            buzzer = data.get("buzzer", "OFF")
            mode = data.get("mode", "MANUAL")

            from data.state import update_zone_state
            update_zone_state(zone_id, temp, humi, gas, pump, buzzer, mode)

            is_gas = self.is_gas_warning(gas)
            is_temp = temp >= TEMP_THRESHOLD
            is_warning = is_gas or is_temp

            print(
                f"ESP32 JSON Zone {zone_id}: "
                f"temp={temp}, humi={humi}, gas={gas}, warning={is_warning}"
            )

            if is_warning:
                if is_gas and is_temp:
                    alert_type = "fire_warning"
                    msg = f"Cảnh báo cháy nguy hiểm (Gas & Nhiệt độ {temp}°C) tại khu vực {zone_id}"
                    val = temp
                elif is_gas:
                    alert_type = "gas_warning"
                    msg = f"Phát hiện khí gas tại khu vực {zone_id}"
                    val = gas
                else:
                    alert_type = "temp_warning"
                    msg = f"Nhiệt độ cao vượt ngưỡng ({temp}°C) tại khu vực {zone_id}"
                    val = temp
                self.handle_zone_alert(zone_id, val, alert_type, msg)
            else:
                self.handle_zone_safe(zone_id, gas)

        except Exception as e:
            print(f"Lỗi phân tích cú pháp esp32c3 data: {e}")

    def handle_esp32_legacy_sensor(self, topic, payload):
        zone_id = int(ESP32_SENSOR_TOPIC_TO_ZONE[topic])

        is_warning = False
        gas_value = 0

        if payload.lower() == "true":
            is_warning = True
            gas_value = 1

        elif payload.lower() == "false":
            is_warning = False
            gas_value = 0

        else:
            try:
                gas_value = int(payload)
                is_warning = self.is_gas_warning(gas_value)
            except Exception:
                print("ESP32 payload không hợp lệ:", payload)
                return

        print(f"ESP32 Legacy Zone {zone_id} value: {payload}")

        if is_warning:
            self.handle_zone_alert(zone_id, gas_value)
        else:
            self.handle_zone_safe(zone_id, gas_value)

    def handle_fireeye_sensor(self, topic, data):
        update_sensor(
            smoke_detected=data.get("smokeDetected", False),
            flame_detected=data.get("flameDetected", False),
            smoke_value=data.get("smokeValue", 0),
            flame_value=data.get("flameValue", 0),
            node=data.get("node", topic.split("/")[-1])
        )

    def handle_control_message(self, data):
        action = data.get("action", "OFF")
        zone_id = data.get("zone_id")

        if action == "reject_alert" or action == "reset_alert":
            self.reset_active_zone()
            return

        if action == "sprinkler_on" and zone_id is not None:
            self.publish_motor_zone(int(zone_id), 1)
            return

        if action == "sprinkler_off" and zone_id is not None:
            self.publish_motor_zone(int(zone_id), 0)
            return

        update_sprinkler(action)

    def handle_zone_alert(self, zone_id, gas_value, alert_type="gas_warning", message=None):
        update_sensor(
            smoke_detected=True,
            flame_detected=False,
            smoke_value=gas_value,
            node=f"ESP32C3_{zone_id}"
        )

        if not message:
            message = f"Phát hiện khí gas tại khu vực {zone_id}"

        self.publish_alert({
            "type": alert_type,
            "zone_id": zone_id,
            "gas_value": gas_value,
            "message": message
        })

        # Logic khóa xoay camera chống nhiễu khi có nhiều zone báo đồng thời
        now = time.time()
        # Cho phép xoay nếu: Chưa có active_zone, HOẶC đã hết thời gian khóa ZONE_LOCK_DURATION (15s)
        if self.active_zone is None or (now - self.last_zone_change_time > self.ZONE_LOCK_DURATION):
            # Chỉ xoay nếu zone báo động khác với active_zone hiện tại để tránh lệnh trùng lặp
            if self.active_zone != zone_id:
                self.active_zone = zone_id
                self.last_zone_change_time = now
                print(f"Cảnh báo [{alert_type}] tại Zone {zone_id}. Xoay camera...")
                try:
                    result = camera_service.goto_zone(zone_id)
                    print("Camera result:", result)
                except Exception as e:
                    print("Camera goto_zone error:", e)
        else:
            print(
                f"Camera đang khóa tại Zone {self.active_zone} (khóa {self.ZONE_LOCK_DURATION}s). "
                f"Bỏ qua lệnh xoay sang Zone {zone_id} để tránh nhiễu."
            )

    def handle_zone_safe(self, zone_id, gas_value):
        print(f"Zone {zone_id} safe")

        update_sensor(
            smoke_detected=False,
            flame_detected=False,
            smoke_value=gas_value,
            node=f"ESP32C3_{zone_id}"
        )

    def is_gas_warning(self, gas):
        try:
            gas_value = float(gas)
            # Khí gas nồng độ trên GAS_THRESHOLD là cảnh báo
            return gas_value > GAS_THRESHOLD
        except Exception:
            return False

    def publish_alert(self, data):
        self.publish(MQTT_ALERT_TOPIC, data)

    def publish_control(self, data):
        self.publish(MQTT_CONTROL_TOPIC, data)

    def publish_motor_zone(self, zone_id: int, value: int):
        topic = ESP32_MOTOR_TOPIC_BY_ZONE.get(zone_id)

        if not topic:
            return {
                "success": False,
                "message": "Zone không hợp lệ",
                "zone_id": zone_id
            }

        payload = "ON" if value == 1 else "OFF"

        try:
            self.client.publish(topic, payload, qos=1)
            update_sprinkler(payload)

            return {
                "success": True,
                "zone_id": zone_id,
                "topic": topic,
                "value": payload
            }

        except Exception as e:
            return {
                "success": False,
                "zone_id": zone_id,
                "topic": topic,
                "message": str(e)
            }

    def reset_active_zone(self):
        old_zone = self.active_zone
        self.active_zone = None
        self.last_zone_change_time = 0.0

        return {
            "success": True,
            "message": "Active zone reset",
            "old_zone": old_zone
        }

    def reject_alert(self, zone_id=None):
        if zone_id is not None:
            motor_result = self.publish_motor_zone(int(zone_id), 0)
        elif self.active_zone is not None:
            motor_result = self.publish_motor_zone(int(self.active_zone), 0)
        else:
            motor_result = None

        reset_result = self.reset_active_zone()

        try:
            camera_result = camera_service.go_home()
        except Exception as e:
            camera_result = {
                "success": False,
"message": str(e)
            }

        return {
            "success": True,
            "action": "reject_alert",
            "motor": motor_result,
            "reset": reset_result,
            "camera": camera_result
        }

    def publish(self, topic, data):
        if not self.connected:
            print("MQTT chưa connected, bỏ qua publish")
            return False

        try:
            payload = json.dumps(data)
            self.client.publish(topic, payload, qos=1)
            return True

        except Exception as e:
            print("MQTT publish error:", e)
            return False

    def get_status(self):
        return {
            "broker": MQTT_BROKER,
            "port": MQTT_PORT,
            "connected": self.connected,
            "sensorTopic": MQTT_SENSOR_TOPIC,
            "alertTopic": MQTT_ALERT_TOPIC,
            "controlTopic": MQTT_CONTROL_TOPIC,
            "esp32Topics": ESP32_SENSOR_TOPIC_TO_ZONE,
            "activeZone": self.active_zone
        }


mqtt_service = MQTTService()
