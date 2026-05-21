from datetime import datetime

sensor_state = {
    "smokeDetected": False,
    "flameDetected": False,
    "smokeValue": 0,
    "flameValue": 0,
    "alertLevel": "safe",
    "lastUpdated": None
}


def update_sensor(smoke_detected, flame_detected, smoke_value=0, flame_value=0):
    global sensor_state

    if flame_detected and smoke_detected:
        alert_level = "danger"
    elif flame_detected or smoke_detected:
        alert_level = "warning"
    else:
        alert_level = "safe"

    sensor_state = {
        "smokeDetected": smoke_detected,
        "flameDetected": flame_detected,
        "smokeValue": smoke_value,
        "flameValue": flame_value,
        "alertLevel": alert_level,
        "lastUpdated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }


def get_sensor_state():
    return sensor_state