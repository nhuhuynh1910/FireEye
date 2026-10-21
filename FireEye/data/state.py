from datetime import datetime


sensor_state = {
    "smokeDetected": False,
    "flameDetected": False,
    "smokeValue": 0,
    "flameValue": 0,
    "node": None,
    "alertLevel": "safe",
    "lastUpdated": None
}

ai_state = {
    "fireDetected": False,
    "smokeDetected": False,
    "humanDetected": False,
    "confidence": 0.0,
    "alertLevel": "safe",
    "lastUpdated": None,
    "bbox": None
}

sprinkler_state = {
    "status": "OFF",
    "lastUpdated": None
}


def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def calc_alert(smoke_detected, flame_detected):
    if smoke_detected and flame_detected:
        return "danger"
    elif smoke_detected or flame_detected:
        return "warning"
    return "safe"


def update_sensor(
    smoke_detected,
    flame_detected,
    smoke_value=0,
    flame_value=0,
    node=None
):
    sensor_state["smokeDetected"] = smoke_detected
    sensor_state["flameDetected"] = flame_detected
    sensor_state["smokeValue"] = smoke_value
    sensor_state["flameValue"] = flame_value
    sensor_state["node"] = node
    sensor_state["alertLevel"] = calc_alert(smoke_detected, flame_detected)
    sensor_state["lastUpdated"] = now()

    return sensor_state


def get_sensor_state():
    return sensor_state


def update_ai_detection(fire_detected, smoke_detected, human_detected, confidence, bbox=None):
    ai_state["fireDetected"] = fire_detected
    ai_state["smokeDetected"] = smoke_detected
    ai_state["humanDetected"] = human_detected
    ai_state["confidence"] = confidence
    ai_state["alertLevel"] = calc_alert(smoke_detected, fire_detected)
    ai_state["lastUpdated"] = now()
    ai_state["bbox"] = bbox

    return ai_state


def get_ai_state():
    return ai_state


def update_sprinkler(action):
    action = action.upper()

    if action not in ["ON", "OFF"]:
        return None

    sprinkler_state["status"] = action
    sprinkler_state["lastUpdated"] = now()

    return sprinkler_state


def get_sprinkler_state():
    return sprinkler_state


zone_states = {
    1: {"temperature": 0.0, "humidity": 0.0, "gas": 0, "pump": "OFF", "buzzer": "OFF", "mode": "MANUAL", "lastUpdated": None, "lastUpdatedTime": 0.0},
    2: {"temperature": 0.0, "humidity": 0.0, "gas": 0, "pump": "OFF", "buzzer": "OFF", "mode": "MANUAL", "lastUpdated": None, "lastUpdatedTime": 0.0},
    3: {"temperature": 0.0, "humidity": 0.0, "gas": 0, "pump": "OFF", "buzzer": "OFF", "mode": "MANUAL", "lastUpdated": None, "lastUpdatedTime": 0.0},
    4: {"temperature": 0.0, "humidity": 0.0, "gas": 0, "pump": "OFF", "buzzer": "OFF", "mode": "MANUAL", "lastUpdated": None, "lastUpdatedTime": 0.0}
}


def update_zone_state(zone_id, temperature, humidity, gas, pump, buzzer, mode):
    import time
    if zone_id in zone_states:
        zone_states[zone_id] = {
            "temperature": temperature,
            "humidity": humidity,
            "gas": gas,
            "pump": pump,
            "buzzer": buzzer,
            "mode": mode,
            "lastUpdated": now(),
            "lastUpdatedTime": time.time()
        }
    return zone_states.get(zone_id)


def get_zone_states():
    return zone_states


def get_overall_status():
    import time
    if sensor_state["alertLevel"] == "danger" or ai_state["alertLevel"] == "danger":
        level = "danger"
    elif sensor_state["alertLevel"] == "warning" or ai_state["alertLevel"] == "warning":
        level = "warning"
    else:
        level = "safe"

    zones_result = {}
    current_time = time.time()
    for z_id, z_val in zone_states.items():
        z_copy = z_val.copy()
        last_time = z_copy.get("lastUpdatedTime", 0.0)
        is_online = (last_time > 0.0) and (current_time - last_time <= 15.0)
        z_copy["online"] = is_online
        zones_result[z_id] = z_copy

    return {
        "backend": "online",
        "overallAlertLevel": level,
        "sensor": sensor_state,
        "ai": ai_state,
        "sprinkler": sprinkler_state,
        "zones": zones_result
    }