import cv2
import pyrealsense2 as rs
import numpy as np
import os
import pickle

# Initialize camera and projector dimensions
cam_img_height = 720
cam_img_width = 1280
framerate = 30

proj_img_height = 900
proj_img_width = 1440
grid_height = 360
grid_width = 480
num_circles_x = 7
num_circles_y = 5
y_offset = 200
radius = 10

# Check for camera calibration data
if not os.path.exists('./calibration/ProCamCalibration.pckl'):
    print("You need to calibrate the camera you'll be using. See calibration project directory for details.")
    exit()
else:
    f = open('./calibration/ProCamCalibration.pckl', 'rb')
    (proj_R, proj_T, projectorMatrix, projectorDistCoeffs, cameraMatrix, distCoeffs, ret) = pickle.load(f)
    f.close()
    if cameraMatrix is None or distCoeffs is None:
        print("Calibration issue. Remove ./calibration/ProCamCalibration.pckl and recalibrate your camera with CalibrateCamera.py.")
        exit()

# Initialize projection display
circles_image = np.zeros((proj_img_height, proj_img_width))
for cy in range(num_circles_y):
    for cx in range(num_circles_x):
        x = round((proj_img_width - grid_width) / 2 + (grid_width / num_circles_x) * cx)
        y = round((proj_img_height - grid_height) / 2 + (grid_height / num_circles_y) * cy) + y_offset
        cv2.circle(circles_image, (x, y), radius, (255, 255, 255), -1)

window_name = 'Calibration Circles'
cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
cv2.imshow(window_name, circles_image)

# Configure and run camera
pipeline = rs.pipeline()
config = rs.config()
config.enable_stream(rs.stream.color, cam_img_width,\
                       cam_img_height, rs.format.bgr8, framerate)
profile = pipeline.start(config)

while True:
        frames = pipeline.wait_for_frames()
        color_frame = frames.get_color_frame()
        if not color_frame:
            continue
        color_image = np.asanyarray(color_frame.get_data())
        cv2.imshow('feed', color_image)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
