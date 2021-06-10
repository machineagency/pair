import cv2
import pyrealsense2 as rs
import numpy as np

img_height = 480
img_width = 640

video_writer = cv2.VideoWriter('sample.avi',
                         cv2.VideoWriter_fourcc(*'MJPG'),
                         10, (img_width, img_height))

pipeline = rs.pipeline()
config = rs.config()
config.enable_stream(rs.stream.color, img_width,\
                       img_height,rs.format.bgr8, 30)
profile = pipeline.start(config)

while True:
        frames = pipeline.wait_for_frames()
        color_frame = frames.get_color_frame()
        if not color_frame:
            continue
        color_image = np.asanyarray(color_frame.get_data())
        cv2.imshow('feed', color_image)
        if cv2.waitKey(1) & 0xFF == ord('s'):
            break

video_writer.release()
cv2.destroyAllWindows()

