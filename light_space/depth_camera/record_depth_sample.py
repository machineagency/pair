import cv2
import pyrealsense2 as rs
import numpy as np

img_height = 480
img_width = 640
framerate = 30

# video_writer = cv2.VideoWriter('sample.avi',
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

while True:
     frames = pipeline.wait_for_frames()
     aligned_frames = align.process(frames)
     depth_frame = aligned_frames.get_depth_frame()
     if not depth_frame:
         continue
     depth_image = np.asanyarray(depth_frame.get_data())
     # video_writer.write(depth_image)
     cv2.imshow('feed', depth_image)
     if cv2.waitKey(1) & 0xFF == ord('s'):
       break

