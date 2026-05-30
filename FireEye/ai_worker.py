import time
import cv2
import numpy as np
import requests

from hailo_platform import (
    HEF,
    VDevice,
    ConfigureParams,
    HailoStreamInterface,
    InferVStreams,
    InputVStreamParams,
    OutputVStreamParams
)

# =========================================
# CONFIG
# =========================================

HEF_PATH = "best.hef"

RTSP_URL = (
    "rtsp://admin:L2D710CD@192.168.1.108:554/"
    "cam/realmonitor?channel=1&subtype=0"
)

API_URL = "http://localhost:8000/api/ai/detect"

INPUT_NAME = "yolov8n/input_layer1"

CLASSES = [
    "cigarette_fire",
    "fire",
    "human",
    "kitchen_fire",
    "lighter_fire",
    "smoke"
]

# BỎ cigarette_fire để giảm báo giả
FIRE_CLASSES = [
    "fire",
    "kitchen_fire",
    "lighter_fire"
]

# =========================================
# THRESHOLD
# =========================================

FIRE_THRESHOLD = 0.25
SMOKE_THRESHOLD = 0.08
HUMAN_THRESHOLD = 0.10

LOOP_DELAY = 2

# =========================================
# SCORE LOGIC
# =========================================

def get_scores(det):

    scores = {}

    for i, name in enumerate(CLASSES):

        class_values = det[:, i].astype(np.float32) / 100.0

        max_score = float(np.max(class_values))

        top_k = np.sort(class_values)[-5:]
        top_score = float(np.mean(top_k))

        scores[name] = max(max_score, top_score)

    return scores


# =========================================
# MAIN
# =========================================

def main():

    print("Loading HEF...")
    hef = HEF(HEF_PATH)

    print("Opening Hailo device...")
    target = VDevice()

    configure_params = ConfigureParams.create_from_hef(
        hef,
        interface=HailoStreamInterface.PCIe
    )

    network_group = target.configure(
        hef,
        configure_params
    )[0]

    network_group_params = network_group.create_params()

    input_vstreams_params = InputVStreamParams.make_from_network_group(
        network_group
    )

    output_vstreams_params = OutputVStreamParams.make_from_network_group(
        network_group
    )

    print("Opening camera...")

    cap = cv2.VideoCapture(
        RTSP_URL,
        cv2.CAP_FFMPEG
    )

    if not cap.isOpened():
        print("Cannot open camera")
        return

    print("Starting AI inference... Ctrl+C để dừng")

    with InferVStreams(
        network_group,
        input_vstreams_params,
        output_vstreams_params
    ) as infer_pipeline:

        with network_group.activate(network_group_params):

            while True:

                ret, frame = cap.read()

                if not ret:
                    print("Cannot read frame")
                    time.sleep(1)
                    continue

                # BGR -> RGB
                rgb = cv2.cvtColor(
                    frame,
                    cv2.COLOR_BGR2RGB
                )

                resized = cv2.resize(
                    rgb,
                    (320, 320)
                )

                input_tensor = np.expand_dims(
                    resized.astype(np.uint8),
                    axis=0
                )

                results = infer_pipeline.infer({
                    INPUT_NAME: input_tensor
                })

                det = results["yolov8n/activation1"][0, 0]

                class_scores = get_scores(det)

                fire_conf = max(
                    class_scores.get(c, 0.0)
                    for c in FIRE_CLASSES
                )

                smoke_conf = class_scores.get(
                    "smoke",
                    0.0
                )

                human_conf = class_scores.get(
                    "human",
                    0.0
                )

                fire_detected = (
                    fire_conf >= FIRE_THRESHOLD
                )

                smoke_detected = (
                    smoke_conf >= SMOKE_THRESHOLD
                )

                human_detected = (
                    human_conf >= HUMAN_THRESHOLD
                )

                if fire_detected:
                    class_name = "fire_group"
                    confidence = fire_conf

                elif smoke_detected:
                    class_name = "smoke"
                    confidence = smoke_conf

                elif human_detected:
                    class_name = "human"
                    confidence = human_conf

                else:
                    class_name = "safe"
                    confidence = 0.0

                payload = {
                    "fire": fire_detected,
                    "smoke": smoke_detected,
                    "human": human_detected and not fire_detected,
                    "confidence": round(confidence, 2)
                }

                print("=" * 50)
                print("CLASS:", class_name)
                print("SCORES:", class_scores)
                print("PAYLOAD:", payload)

                if (
                    fire_detected
                    or smoke_detected
                    or human_detected
                ):

                    try:

                        requests.post(
                            API_URL,
                            json=payload,
                            timeout=15
                        )

                        print("POST OK")

                    except Exception as e:
                        print("POST ERROR:", e)

                else:
                    print("SAFE - skip POST")

                time.sleep(LOOP_DELAY)


if __name__ == "__main__":
    main()
