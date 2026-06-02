import time
import cv2
import numpy as np
import requests

from hailo_platform import (
    HEF, VDevice, ConfigureParams, HailoStreamInterface,
    InferVStreams, InputVStreamParams, OutputVStreamParams, FormatType
)

HEF_PATH = "best.hef"

RTSP_URL = (
    "rtsp://admin:L2D710CD@10.10.10.2:554/"
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

FIRE_CLASSES = ["fire", "kitchen_fire", "lighter_fire"]

FIRE_THRESHOLD = 0.70
SMOKE_THRESHOLD = 0.60
HUMAN_THRESHOLD = 0.75

FIRE_CONFIRM_FRAMES = 2
SMOKE_CONFIRM_FRAMES = 2
HUMAN_CONFIRM_FRAMES = 3

LOST_FRAMES_LIMIT = 1
LOOP_DELAY = 0.03
TOP_K_BOXES = 30


def softmax(x):
    e_x = np.exp(x - np.max(x, axis=-1, keepdims=True))
    return e_x / e_x.sum(axis=-1, keepdims=True)


def is_camera_blocked(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    brightness = np.mean(gray)
    contrast = np.std(gray)

    edges = cv2.Canny(gray, 50, 150)
    edge_ratio = np.count_nonzero(edges) / edges.size

    return brightness < 35 or contrast < 18 or edge_ratio < 0.01


def generate_anchors():
    anchors = []
    strides = [8, 16, 32]
    grid_sizes = [40, 20, 10]

    for stride, grid_size in zip(strides, grid_sizes):
        for y in range(grid_size):
            for x in range(grid_size):
                anchors.append(((x + 0.5) * stride, (y + 0.5) * stride, stride))

    return anchors


def get_scores(det):
    scores = {}
    for i, name in enumerate(CLASSES):
        values = det[:, i].astype(np.float32)
        scores[name] = float(np.max(values))
    return scores


def decode_bbox(boxes_raw, anchors, anchor_idx):
    anchor_x, anchor_y, stride = anchors[anchor_idx]
    bbox_dist = []

    for side in range(4):
        logits = boxes_raw[anchor_idx, side * 16:(side + 1) * 16]
        probs = softmax(logits)
        expected_dist = sum(float(p) * i for i, p in enumerate(probs))
        bbox_dist.append(expected_dist * stride)

    x1 = max(0.0, min(320.0, anchor_x - bbox_dist[0]))
    y1 = max(0.0, min(320.0, anchor_y - bbox_dist[1]))
    x2 = max(0.0, min(320.0, anchor_x + bbox_dist[2]))
    y2 = max(0.0, min(320.0, anchor_y + bbox_dist[3]))

    return x1, y1, x2, y2


def get_best_bbox(det, boxes_raw, anchors, target_class_idx, w_orig, h_orig):
    scores_for_class = det[:, target_class_idx]
    top_indices = np.argsort(scores_for_class)[-TOP_K_BOXES:][::-1]

    best_box = None
    best_score = -1

    for idx in top_indices:
        score = float(scores_for_class[idx])
        x1, y1, x2, y2 = decode_bbox(boxes_raw, anchors, int(idx))

        bw_320 = x2 - x1
        bh_320 = y2 - y1

        if bw_320 <= 2 or bh_320 <= 2:
            continue

        if score > best_score:
            best_score = score
            best_box = (x1, y1, x2, y2)

    if best_box is None:
        return None

    x1, y1, x2, y2 = best_box

    bbox = [
        int(x1 * w_orig / 320.0),
        int(y1 * h_orig / 320.0),
        int(x2 * w_orig / 320.0),
        int(y2 * h_orig / 320.0)
    ]

    bw = bbox[2] - bbox[0]
    bh = bbox[3] - bbox[1]
    area = bw * bh
    frame_area = w_orig * h_orig

    if bw <= 0 or bh <= 0:
        return None

    class_name = CLASSES[target_class_idx]

    if class_name == "human":
        # Chặn box human ma quá to
        if bw > w_orig * 0.60:
            return None

        if bh > h_orig * 0.90:
            return None

        if area > frame_area * 0.45:
            return None

        # Chặn box quá nhỏ
        if bw < w_orig * 0.04:
            return None

        if bh < h_orig * 0.10:
            return None

    return bbox


def post_ai_result(payload):
    try:
        requests.post(API_URL, json=payload, timeout=0.3)
        print("POST OK")
    except Exception as e:
        print("POST ERROR:", e)


def make_payload(class_name, confidence, bbox):
    return {
        "fire": class_name in FIRE_CLASSES,
        "smoke": class_name == "smoke",
        "human": class_name == "human",
        "confidence": round(confidence, 2),
        "class_name": class_name,
        "bbox": bbox,
        "timestamp": time.time()
    }


def send_payload(class_name, confidence, bbox):
    payload = make_payload(class_name, confidence, bbox)
    print("=" * 50)
    print("PAYLOAD:", payload)
    post_ai_result(payload)


def reset_all():
    return "safe", None, 0.0, 0, 0, 0, 0


def main():
    print("Loading HEF...")
    hef = HEF(HEF_PATH)

    print("Opening Hailo device...")
    target = VDevice()

    configure_params = ConfigureParams.create_from_hef(
        hef,
        interface=HailoStreamInterface.PCIe
    )

    network_group = target.configure(hef, configure_params)[0]
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
    cap = cv2.VideoCapture(RTSP_URL, cv2.CAP_FFMPEG)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    if not cap.isOpened():
        print("Cannot open camera")
        return

    print("Starting AI inference... Ctrl+C để dừng")

    locked_class = "safe"
    locked_bbox = None
    locked_confidence = 0.0

    lost_frames = 0
    fire_confirm_count = 0
    smoke_confirm_count = 0
    human_confirm_count = 0

    with InferVStreams(
        network_group,
        input_vstreams_params,
        output_vstreams_params
    ) as infer_pipeline:

        with network_group.activate(network_group_params):

            while True:
                cap.grab()
                ret, frame = cap.read()

                if not ret:
                    print("Cannot read frame")
                    time.sleep(1)
                    continue

                if is_camera_blocked(frame):
                    locked_class = "safe"
                    locked_bbox = None
                    locked_confidence = 0.0
                    lost_frames = 0
                    fire_confirm_count = 0
                    smoke_confirm_count = 0
                    human_confirm_count = 0

                    print("CAMERA BLOCKED / LOW DETAIL")
                    send_payload("safe", 0.0, None)
                    time.sleep(LOOP_DELAY)
                    continue

                h_orig, w_orig = frame.shape[:2]

                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                resized = cv2.resize(rgb, (320, 320))
                input_tensor = np.expand_dims(resized.astype(np.uint8), axis=0)

                results = infer_pipeline.infer({
                    INPUT_NAME: input_tensor
                })

                det = results["yolov8n/activation1"][0, 0]
                boxes_raw = results["yolov8n/concat14"][0, 0]

                class_scores = get_scores(det)

                fire_conf = max(class_scores.get(c, 0.0) for c in FIRE_CLASSES)
                smoke_conf = class_scores.get("smoke", 0.0)
                human_conf = class_scores.get("human", 0.0)

                current_class = "safe"
                confidence = 0.0
                target_class_idx = -1

                if fire_conf >= FIRE_THRESHOLD:
                    fire_confirm_count += 1
                    smoke_confirm_count = 0
                    human_confirm_count = 0

                    if fire_confirm_count >= FIRE_CONFIRM_FRAMES:
                        best_fire_class = max(
                            FIRE_CLASSES,
                            key=lambda c: class_scores.get(c, 0.0)
                        )
                        current_class = best_fire_class
                        confidence = fire_conf
                        target_class_idx = CLASSES.index(best_fire_class)

                elif smoke_conf >= SMOKE_THRESHOLD:
                    smoke_confirm_count += 1
                    fire_confirm_count = 0
                    human_confirm_count = 0

                    if smoke_confirm_count >= SMOKE_CONFIRM_FRAMES:
                        current_class = "smoke"
                        confidence = smoke_conf
                        target_class_idx = CLASSES.index("smoke")

                elif human_conf >= HUMAN_THRESHOLD:
                    human_confirm_count += 1
                    fire_confirm_count = 0
                    smoke_confirm_count = 0

                    if human_confirm_count >= HUMAN_CONFIRM_FRAMES:
                        current_class = "human"
                        confidence = human_conf
                        target_class_idx = CLASSES.index("human")

                else:
                    fire_confirm_count = 0
                    smoke_confirm_count = 0
                    human_confirm_count = 0

                current_bbox = None

                if target_class_idx != -1:
                    current_bbox = get_best_bbox(
                        det,
                        boxes_raw,
                        anchors,
                        target_class_idx,
                        w_orig,
                        h_orig
                    )

                if current_class != "safe" and current_bbox is not None:
                    locked_class = current_class
                    locked_confidence = confidence
                    locked_bbox = current_bbox
                    lost_frames = 0
                else:
                    # Quan trọng: nếu human bị bbox filter loại thì reset confirm
                    if current_class == "human":
                        human_confirm_count = 0

                    lost_frames += 1

                    if lost_frames >= LOST_FRAMES_LIMIT:
                        locked_class = "safe"
                        locked_bbox = None
                        locked_confidence = 0.0
                        lost_frames = 0

                print("=" * 50)
                print("CURRENT CLASS:", current_class)
                print("LOCKED CLASS:", locked_class)
                print("SCORES:", class_scores)
                print(
                    "CONFIRM:",
                    "fire", fire_confirm_count,
                    "smoke", smoke_confirm_count,
                    "human", human_confirm_count
                )

                send_payload(
                    locked_class,
                    locked_confidence,
                    locked_bbox
                )

                time.sleep(LOOP_DELAY)


if __name__ == "__main__":
    main()