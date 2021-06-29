import cv2
import pyrealsense2 as rs
import numpy as np

# img_height = 480
# img_width = 640

img_height = 720
img_width = 1280

proj_height = 900
proj_width = 1440

grid_height = 360
grid_width = 480

num_circles_x = 7
num_circles_y = 5
y_offset = 200
radius = 10
framerate = 30

video_writer = cv2.VideoWriter('sample.avi',
                         cv2.VideoWriter_fourcc(*'MJPG'),
                         10, (img_width, img_height))

pipeline = rs.pipeline()
config = rs.config()
config.enable_stream(rs.stream.color, img_width,\
                       img_height, rs.format.bgr8, framerate)
profile = pipeline.start(config)

circles_image = np.zeros((proj_height, proj_width))
for cy in range(num_circles_y):
    for cx in range(num_circles_x):
        x = round((proj_width - grid_width) / 2 + (grid_width / num_circles_x) * cx)
        y = round((proj_height - grid_height) / 2 + (grid_height / num_circles_y) * cy) + y_offset
        cv2.circle(circles_image, (x, y), radius, (255, 255, 255), -1)

window_name = 'Calibration Circles'
cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
cv2.imshow(window_name, circles_image)

# while True:
#     if cv2.waitKey(1) & 0xFF == ord('s'):
#         break

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

video_writer.release()
cv2.destroyAllWindows()

