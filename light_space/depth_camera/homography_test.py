import numpy as np
import cv2
import cv2.aruco as aruco
import pyrealsense2 as rs
import sys

cam_img_height = 1080
cam_img_width = 1920
proj_img_height = 900
proj_img_width = 1440

cv2.namedWindow('Projector',cv2.WINDOW_NORMAL)
cv2.namedWindow('Camera',cv2.WINDOW_NORMAL)

# Project localization pattern
aruco1 = cv2.imread('./patterns/test_marker1.jpg')
aruco2 = cv2.imread('./patterns/test_marker2.jpg')
aruco3 = cv2.imread('./patterns/test_marker3.jpg')
aruco4 = cv2.imread('./patterns/test_marker4.jpg')
proj_img = np.zeros((proj_img_width, proj_img_height, 3), np.uint8)
off = 5
proj_img = np.zeros((720, 1280, 3), np.uint8)
proj_img[:] = (255, 255, 255)
proj_img[off:off+aruco1.shape[0],
            off:off+aruco1.shape[1]] = aruco1
proj_img[off:off+aruco1.shape[0],
            -aruco1.shape[1] -off:-off] = aruco2
proj_img[-aruco1.shape[0]-off:-off, off:aruco1.shape[1]+off] = aruco3
proj_img[-aruco1.shape[0]-off:-off, -aruco1.shape[1]-off:-off] = aruco4

cv2.imshow('Projector', proj_img)
while True:
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

sys.exit(0)

# Start camera
pipeline = rs.pipeline()
config = rs.config()
config.enable_stream(rs.stream.color, img_width,\
                       img_height, rs.format.bgr8, framerate)
profile = pipeline.start(config)
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
