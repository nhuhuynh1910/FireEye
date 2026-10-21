import cv2
import numpy as np
import hailo_platform as hpf

HEF_PATH = "best.hef"
IMAGE_PATH = "frame_test.jpg"
CLASSES = ["cigarette_fire", "fire", "human", "kitchen_fire", "lighter_fire", "smoke"]

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

def main():
    hef = hpf.HEF(HEF_PATH)
    target = hpf.VDevice()
    
    configure_params = hpf.ConfigureParams.create_from_hef(
        hef,
        interface=hpf.HailoStreamInterface.PCIe
    )
    
    network_groups = target.configure(hef, configure_params)
    network_group = network_groups[0]
    network_group_params = network_group.create_params()
    
    input_vstreams_params = hpf.InputVStreamParams.make_from_network_group(
        network_group,
        quantized=True,
        format_type=hpf.FormatType.UINT8
    )
    
    output_vstreams_params = hpf.OutputVStreamParams.make_from_network_group(
        network_group,
        quantized=False,
        format_type=hpf.FormatType.FLOAT32
    )
    
    input_info = hef.get_input_vstream_infos()[0]
    
    img = cv2.imread(IMAGE_PATH)
    if img is None:
        print(f"Error: Cannot read image {IMAGE_PATH}")
        return
        
    h_orig, w_orig = img.shape[:2]
    img_resized = cv2.resize(img, (320, 320))
    img_input = np.expand_dims(img_resized, axis=0).astype(np.uint8)
    
    with network_group.activate(network_group_params):
        with hpf.InferVStreams(
            network_group,
            input_vstreams_params,
            output_vstreams_params
        ) as infer_pipeline:
            results = infer_pipeline.infer({input_info.name: img_input})
            
    # yolov8n/activation1: (1, 1, 2100, 6)
    # yolov8n/concat14: (1, 2100, 64)
    scores = results["yolov8n/activation1"][0, 0]
    boxes_raw = results["yolov8n/concat14"][0, 0]
    
    anchors = generate_anchors()
    
    detections = []
    
    for idx, (anchor_x, anchor_y, stride) in enumerate(anchors):
        # find max class score
        class_probs = scores[idx]
        class_id = np.argmax(class_probs)
        confidence = class_probs[class_id]
        
        # print some debug info
        if confidence > 0.05:
            # Decode bbox
            # boxes_raw[idx] has shape (64,) -> 4 sides * 16 bins
            bbox_dist = []
            for side in range(4):
                logits = boxes_raw[idx, side*16 : (side+1)*16]
                probs = softmax(logits)
                expected_dist = sum(p * i for i, p in enumerate(probs))
                bbox_dist.append(expected_dist * stride)
            
            # dist: left, top, right, bottom
            x1 = anchor_x - bbox_dist[0]
            y1 = anchor_y - bbox_dist[1]
            x2 = anchor_x + bbox_dist[2]
            y2 = anchor_y + bbox_dist[3]
            
            # Scale back to original image coordinates
            x1 = int(x1 * w_orig / 320.0)
            y1 = int(y1 * h_orig / 320.0)
            x2 = int(x2 * w_orig / 320.0)
            y2 = int(y2 * h_orig / 320.0)
            
            detections.append({
                "class_id": class_id,
                "class_name": CLASSES[class_id],
                "confidence": confidence,
                "bbox": [x1, y1, x2, y2]
            })
            
    # Sort detections by confidence descending
    detections = sorted(detections, key=lambda d: d["confidence"], reverse=True)
    
    print(f"Total detections with confidence > 0.05: {len(detections)}")
    max_score_overall = np.max(scores)
    print(f"Max score overall in activation1: {max_score_overall:.4f}")
    for d in detections[:10]:
        print(f"Class: {d['class_name']}, Confidence: {d['confidence']:.4f}, BBox: {d['bbox']}")

if __name__ == "__main__":
    main()
