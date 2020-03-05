import pyrealsense2 as rs
import numpy as np
import cv2

class DepthCamera():
    def __init__(self):
        self.pipeline = rs.pipeline()
        self.config = rs.config()
        self.config.enable_stream(rs.stream.depth, 640, 480,\
                                    rs.format.z16, 30)
        self.config.enable_stream(rs.stream.color, 640, 480,\
                                    rs.format.bgr8, 30)
        self.profile = self.pipeline.start(self.config)

    def smooth_image(self, img):
        return cv2.GaussianBlur(img, (3, 3), 1, 1)

    def compute_sobel_gradients(self, depth_img):
        sobel_x = cv2.Sobel(depth_img, cv2.CV_64F, 1, 0, ksize=7)
        sobel_y = cv2.Sobel(depth_img, cv2.CV_64F, 0, 1, ksize=7)
        return (sobel_x, sobel_y)

    def test(self):
        try:
            while True:
                frames = self.pipeline.wait_for_frames()
                depth_frame = frames.get_depth_frame()
                if not depth_frame:
                    continue
                depth_image = np.asanyarray(depth_frame.get_data())
                depth_colormap = cv2.applyColorMap(cv2.convertScaleAbs(depth_image, alpha=0.03), cv2.COLORMAP_JET)
                sobel_x, sobel_y = self.compute_sobel_gradients(depth_image)
                sobel_images = np.hstack((sobel_x, sobel_y))
                cv2.namedWindow('depth', cv2.WINDOW_AUTOSIZE)
                cv2.imshow('depth', sobel_images)
                key = cv2.waitKey(1)
                # Press esc or 'q' to close the image window
                if key & 0xFF == ord('q') or key == 27:
                    cv2.destroyAllWindows()
                    break
        finally:
            self.pipeline.stop()

if __name__ == '__main__':
    dc = DepthCamera()
    dc.test()
