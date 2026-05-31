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
    OutputVStreamParams,
    FormatType
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
# UTILS & DECODING LOGIC
# =========================================

def softmax(x):
    e_x = np.exp(x - np.max(x, axis=-1, keepdims=True))
    return e_x / e_x.sum(axis=-1, keepdims=True)


def generate_anchors():
    anchors = []
    strides = [8, 16, 32]
    grid_sizes = [40, 20, 10]
    
    for stride, grid_size in zip(strides, grid_sizes):
        for y in range(grid_size):
            for x in range(grid_size):
                # anchor center in 320x320 coordinates
                anchor_x = (x + 0.5) * stride
                anchor_y = (y + 0.5) * stride
                anchors.append((anchor_x, anchor_y, stride))
    return anchors


def get_scores(det):

    scores = {}

    for i, name in enumerate(CLASSES):

        class_values = det[:, i].astype(np.float32)

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

    anchors = generate_anchors()

    input_vstreams_params = InputVStreamParams.make_from_network_group(
        network_group,
        quantized=True,
        format_type=FormatType.UINT8
    )

    output_vstreams_params = OutputVStreamParams.make_from_network_group(
        network_group,
        quantized=False,
        format_type=FormatType.FLOAT32
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
                boxes_raw = results["yolov8n/concat14"][0, 0]

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

                target_class_idx = -1
                if fire_detected:
                    class_name = "fire_group"
                    confidence = fire_conf
                    fire_map = {
                        "fire": 1,
                        "kitchen_fire": 3,
                        "lighter_fire": 4
                    }
                    best_fire_class = max(FIRE_CLASSES, key=lambda c: class_scores.get(c, 0.0))
                    target_class_idx = fire_map[best_fire_class]

                elif smoke_detected:
                    class_name = "smoke"
                    confidence = smoke_conf
                    target_class_idx = 5

                elif human_detected:
                    class_name = "human"
                    confidence = human_conf
                    target_class_idx = 2

                else:
                    class_name = "safe"
                    confidence = 0.0

                bbox = None
                if target_class_idx != -1:
                    # Find the anchor with the highest score for this class
                    scores_for_class = det[:, target_class_idx]
                    best_anchor_idx = int(np.argmax(scores_for_class))

                    # Decode bounding box for best_anchor_idx
                    anchor_x, anchor_y, stride = anchors[best_anchor_idx]
                    bbox_dist = []
                    for side in range(4):
                        logits = boxes_raw[best_anchor_idx, side*16 : (side+1)*16]
                        probs = softmax(logits)
                        expected_dist = sum(p * i for i, p in enumerate(probs))
                        bbox_dist.append(expected_dist * stride)

                    # Tọa độ trên ảnh 320x320
                    x1 = anchor_x - bbox_dist[0]
                    y1 = anchor_y - bbox_dist[1]
                    x2 = anchor_x + bbox_dist[2]
                    y2 = anchor_y + bbox_dist[3]

                    # Giới hạn trong khoảng [0.0, 320.0]
                    x1 = max(0.0, min(320.0, x1))
                    y1 = max(0.0, min(320.0, y1))
                    x2 = max(0.0, min(320.0, x2))
                    y2 = max(0.0, min(320.0, y2))

                    # Quy đổi về kích thước camera gốc
                    w_orig = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1920
                    h_orig = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 1080

                    x1_orig = int(x1 * w_orig / 320.0)
                    y1_orig = int(y1 * h_orig / 320.0)
                    x2_orig = int(x2 * w_orig / 320.0)
                    y2_orig = int(y2 * h_orig / 320.0)

                    bbox = [x1_orig, y1_orig, x2_orig, y2_orig]

                payload = {
                    "fire": fire_detected,
                    "smoke": smoke_detected,
                    "human": human_detected and not fire_detected,
                    "confidence": round(confidence, 2),
                    "bbox": bbox
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
