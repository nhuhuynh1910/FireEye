import json
import paho.mqtt.client as mqtt

from config.settings import (
    MQTT_BROKER,
    MQTT_PORT,
    MQTT_SENSOR_TOPIC,
    MQTT_ALERT_TOPIC,
    MQTT_CONTROL_TOPIC
)

from data.state import update_sensor, update_sprinkler


class MQTTService:
    def __init__(self):
        self.client = mqtt.Client()
        self.connected = False

        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message

    def start(self):
        try:
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
        else:
            self.connected = False
            print("MQTT failed, rc =", rc)

    def on_message(self, client, userdata, msg):
        topic = msg.topic
        payload = msg.payload.decode("utf-8")

        print("MQTT message:", topic, payload)

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
            "controlTopic": MQTT_CONTROL_TOPIC
        }


mqtt_service = MQTTService()