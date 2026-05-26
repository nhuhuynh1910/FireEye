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
    "confidence": 0.0,
    "alertLevel": "safe",
    "lastUpdated": None
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


def update_ai_detection(fire_detected, smoke_detected, confidence):
    ai_state["fireDetected"] = fire_detected
    ai_state["smokeDetected"] = smoke_detected
    ai_state["confidence"] = confidence
    ai_state["alertLevel"] = calc_alert(smoke_detected, fire_detected)
    ai_state["lastUpdated"] = now()

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


def get_overall_status():
    if sensor_state["alertLevel"] == "danger" or ai_state["alertLevel"] == "danger":
        level = "danger"
    elif sensor_state["alertLevel"] == "warning" or ai_state["alertLevel"] == "warning":
        level = "warning"
    else:
        level = "safe"

    return {
        "backend": "online",
        "overallAlertLevel": level,
        "sensor": sensor_state,
        "ai": ai_state,
        "sprinkler": sprinkler_state
    }