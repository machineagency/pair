import numpy as np
import cv2
import cv2.aruco as aruco
import pyrealsense2 as rs

cam_img_height = 1080
cam_img_width = 1920
proj_img_height = 900
proj_img_width = 1440

pipeline = rs.pipeline()
config = rs.config()
config.enable_stream(rs.stream.color, img_width,\
                       img_height, rs.format.bgr8, framerate)
profile = pipeline.start(config)

# Project localization pattern

# Start camera
while True:
        frames = pipeline.wait_for_frames()
        color_frame = frames.get_color_frame()
        if not color_frame:
            continue
        color_image = np.asanyarray(color_frame.get_data())
        video_writer.write(color_image)
        cv2.imshow('feed', color_image)
        if cv2.waitKey(1) & 0xFF == ord('s'):
            break
