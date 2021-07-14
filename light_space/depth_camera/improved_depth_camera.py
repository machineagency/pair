import cv2
import pyrealsense2 as rs
import numpy as np

img_height = 480
img_width = 640
framerate = 30

# video_writer = cv2.VideoWriter('depth_sample.avi',
#                          cv2.VideoWriter_fourcc(*'MJPG'),
#                          10, (img_width, img_height))

pipeline = rs.pipeline()
config = rs.config()
config.enable_stream(rs.stream.color, img_width,\
                       img_height, rs.format.bgr8, framerate)
config.enable_stream(rs.stream.depth, img_width,\
                       img_height, rs.format.z16, framerate)
# Align depth frame to color frame
align_to = rs.stream.color
align = rs.align(align_to)
profile = pipeline.start(config)

# Declare filters
decimation_filter = rs.decimation_filter ()
spatial_filter = rs.spatial_filter()
temporal_filter = rs.temporal_filter()

while True:
    # Get raw image
    frames = pipeline.wait_for_frames()
    aligned_frames = align.process(frames)
    depth_frame = aligned_frames.get_depth_frame()
    # depth_frame = frames.get_depth_frame()
    if not depth_frame:
        continue
    depth_frame = decimation_filter.process(depth_frame)
    depth_frame = spatial_filter.process(depth_frame)
    depth_frame = temporal_filter.process(depth_frame)
    depth_image = np.asanyarray(depth_frame.get_data())

    # Apply gradient, or not
    depth_image = np.gradient(depth_image, axis=0)
    depth_image = depth_image * 100

    # Hacky thresholding
    thresh_shallowest = 400
    thresh_deepest = 1000000000
    # depth_image = np.where(np.logical_and(\
    #         depth_image > thresh_shallowest,\
    #         depth_image < thresh_deepest), depth_image, 0)
    depth_colormap = cv2.applyColorMap(cv2.convertScaleAbs(depth_image, alpha=0.03), cv2.COLORMAP_JET)
    cv2.imshow('feed', depth_colormap)
    # video_writer.write(depth_colormap)
    if cv2.waitKey(1) & 0xFF == ord('q'):
      break

