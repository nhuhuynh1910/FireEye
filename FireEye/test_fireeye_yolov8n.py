import cv2
import numpy as np
import hailo_platform as hpf

HEF_PATH = "/home/pi5/models/fireeye_yolov8n.hef"
IMAGE_PATH = "frame_test.jpg"

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
output_info = hef.get_output_vstream_infos()[0]

img = cv2.imread(IMAGE_PATH)
if img is None:
    print(f"Error: Cannot read image {IMAGE_PATH}")
    exit(1)

# Resize to match 320x320 input
img_resized = cv2.resize(img, (320, 320))
img_input = np.expand_dims(img_resized, axis=0).astype(np.uint8)

with network_group.activate(network_group_params):
    with hpf.InferVStreams(
        network_group,
        input_vstreams_params,
        output_vstreams_params
    ) as infer_pipeline:
        results = infer_pipeline.infer({input_info.name: img_input})

print("\nInference Successful!")
output = results[output_info.name]
print(f"Output shape: {output.shape}")
print(f"Number of detections (first float): {output[0, 0, 0, 0]}")
# Print the non-zero elements or first few elements
print(f"First 20 elements: {output[0, 0, 0, :20]}")
