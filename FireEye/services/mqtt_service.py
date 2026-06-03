import json
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
    GAS_THRESHOLD_LOW
)

from data.state import update_sensor, update_sprinkler
from services.camera_service import camera_service


# ==========================
# ESP32 ZONE TOPICS
# ==========================

ESP32_MOTOR_TOPIC_BY_ZONE = {
    1: "esp32c3_1/motor"
}


class MQTTService:
    def __init__(self):
        self.client = mqtt.Client()
        self.connected = False

        # Lưu zone đang cảnh báo để camera không quay liên tục tới chạm biên
        self.active_zone = None

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

            print("MQTT service stopped")

        except Exception as e:
            print("MQTT stop error:", e)

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.connected = True

            print("MQTT connected")

            client.subscribe(MQTT_SENSOR_TOPIC)
            client.subscribe(MQTT_CONTROL_TOPIC)

            print("Subscribed:", MQTT_SENSOR_TOPIC)
            print("Subscribed:", MQTT_CONTROL_TOPIC)

            for topic in ESP32_SENSOR_TOPIC_TO_ZONE.keys():
                client.subscribe(topic)
                print("Subscribed ESP32:", topic)

        else:
            self.connected = False
            print("MQTT failed, rc =", rc)

    def on_message(self, client, userdata, msg):
        topic = msg.topic
        payload = msg.payload.decode("utf-8").strip()

        print("MQTT message:", topic, payload)

        # ==========================
        # CASE 1: ESP32 Zone Sensor
        # Topic: esp32c3_1/sensor
        # Payload: true / false / 600 / 700 / 2939...
        # ==========================

        if topic in ESP32_SENSOR_TOPIC_TO_ZONE:
            zone_id = ESP32_SENSOR_TOPIC_TO_ZONE[topic]

            is_warning = False
            gas_value = 0

            if payload.lower() == "true":
                is_warning = True
                gas_value = 1

            elif payload.lower() == "false":
                is_warning = False
                gas_value = 0

                if self.active_zone == zone_id:
                    print(f"Zone {zone_id} đã hết cảnh báo")
                    self.active_zone = None

                return

            else:
                try:
                    gas_value = int(payload)
                    is_warning = gas_value >= GAS_THRESHOLD_LOW
                except Exception:
                    print("ESP32 payload không hợp lệ:", payload)
                    return

            print(f"ESP32 Zone {zone_id} value: {payload}")

            if is_warning:
                if self.active_zone == zone_id:
                    print(f"Zone {zone_id} đã quay rồi, bỏ qua")
                    return

                self.active_zone = zone_id

                print(f"Gas warning at Zone {zone_id}. Camera moving...")

                result = camera_service.goto_zone(zone_id)

                print("Camera result:", result)

                self.publish_alert({
                    "type": "gas_warning",
                    "zone_id": zone_id,
                    "gas_value": gas_value,
                    "message": f"Phát hiện khí gas tại khu vực {zone_id}"
                })

            return

        # ==========================
        # CASE 2: Old FireEye JSON Sensor
        # Topic: fireeye/sensor/...
        # Payload: JSON
        # ==========================

        try:
            data = json.loads(payload)

        except Exception:
            print("MQTT payload không phải JSON")
            return

        if topic.startswith("fireeye/sensor/"):
            update_sensor(
                smoke_detected=data.get("smokeDetected", False),
                flame_detected=data.get("flameDetected", False),
                smoke_value=data.get("smokeValue", 0),
                flame_value=data.get("flameValue", 0),
                node=data.get("node", topic.split("/")[-1])
            )

        elif topic == MQTT_CONTROL_TOPIC:
            action = data.get("action", "OFF")
            update_sprinkler(action)

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

        self.client.publish(topic, str(value))

        return {
            "success": True,
            "zone_id": zone_id,
            "topic": topic,
            "value": value
        }

    def reset_active_zone(self):
        self.active_zone = None

        return {
            "success": True,
            "message": "Active zone reset"
        }

    def publish(self, topic, data):
        if not self.connected:
            print("MQTT chưa connected, bỏ qua publish")
            return False

        try:
            payload = json.dumps(data)
            self.client.publish(topic, payload)
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