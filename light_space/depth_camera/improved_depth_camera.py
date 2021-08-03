import cv2
import pyrealsense2 as rs
import numpy as np
import time

img_height = 480
img_width = 640
framerate = 30

# video_writer = cv2.VideoWriter('depth_sample.avi',
#                          cv2.VideoWriter_fourcc(*'MJPG'),
#                          10, (img_width, img_height))

pipeline = rs.pipeline()
config = rs.config()
config.enable_stream(rs.stream.infrared, img_width,\
                       img_height, rs.format.bgr8, framerate)
config.enable_stream(rs.stream.depth, img_width,\
                       img_height, rs.format.z16, framerate)
# Align depth frame to color frame
align_to = rs.stream.color
align = rs.align(align_to)
profile = pipeline.start(config)

# Declare filters
DECIMATION_FACTOR = 2
decimation_filter = rs.decimation_filter ()
spatial_filter = rs.spatial_filter()
temporal_filter = rs.temporal_filter()

def get_infra_and_depth_images():
    # Get raw image
    frames = pipeline.wait_for_frames()
    aligned_frames = align.process(frames)
    depth_frame = aligned_frames.get_depth_frame()
    depth_frame = decimation_filter.process(depth_frame)
    # depth_frame = spatial_filter.process(depth_frame)
    depth_frame = temporal_filter.process(depth_frame)
    depth_image = np.asanyarray(depth_frame.get_data())

    infra_frame = aligned_frames.get_infrared_frame()
    # infra_frame = decimation_filter.process(infra_frame)
    infra_frame = spatial_filter.process(infra_frame)
    infra_frame = temporal_filter.process(infra_frame)
    infra_image = np.asanyarray(infra_frame.get_data())
    return (infra_image, depth_image)

# Get baseline
baseline = np.zeros((img_height // DECIMATION_FACTOR, img_width // DECIMATION_FACTOR))
GATHERING_FPS = 20
GATHERING_TIME = 1
n = GATHERING_FPS * GATHERING_TIME

print('Gathering baseline frames...')
for _ in range(n):
    _, depth_image = get_infra_and_depth_images()
    baseline = baseline + depth_image
    time.sleep(1 / GATHERING_FPS)
print('... done.')
baseline = baseline / n

erode_kernel = np.ones((3, 3))
baseline = cv2.erode(baseline, erode_kernel)

while True:
    infra_image, depth_image = get_infra_and_depth_images()
    depth_image = cv2.erode(depth_image, erode_kernel)
    diff_image = baseline - depth_image

    dog = cv2.GaussianBlur(diff_image, (5, 5), 3)\
            - cv2.GaussianBlur(diff_image, (3, 3), 1)

    # diff_image = diff_image - dog
    img_low = np.zeros(diff_image.shape)
    img_high = 255 * np.ones(diff_image.shape)
    diff_image = np.where(np.logical_and(\
            diff_image > 4, diff_image < 20,
            ), img_high, img_low)

    # Apply gradient, or not
    # grad_x = np.gradient(diff_image, axis=0)
    # grad_y = np.gradient(diff_image, axis=1)
    # grad_sum = (grad_x + grad_y)

    # Process infrared image
    # canny_low = 1000
    # canny_high = 2000
    # infra_image = cv2.Canny(infra_image, canny_low, canny_high,\
    #         apertureSize=5, L2gradient=True)

    infra_image = cv2.GaussianBlur(infra_image, (7, 7), 5)
    infra_image = cv2.cvtColor(infra_image, cv2.COLOR_BGR2GRAY)
    infra_image = cv2.adaptiveThreshold(infra_image, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
            cv2.THRESH_BINARY, 21, 0)

    # diff_image = cv2.applyColorMap(cv2.convertScaleAbs(diff_image, alpha=0.03), cv2.COLORMAP_JET)
    # cv2.imshow('feed', diff_image)
    cv2.imshow('feed', infra_image)
    # video_writer.write(depth_colormap)
    if cv2.waitKey(1) & 0xFF == ord('q'):
      break

