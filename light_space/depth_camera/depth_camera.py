import pyrealsense2 as rs
import numpy as np
import cv2

class DepthCamera():
    def __init__(self):
        self.pipeline = self.init_pipeline()
        self.pipeline = rs.pipeline()
        self.config = rs.config()
        self.config.enable_stream(rs.stream.depth, 640, 480,\
                                    rs.format.z16, 30)
        self.config.enable_stream(rs.stream.color, 640, 480,\
                                    rs.format.bgr8, 30)
        self.profile = self.pipeline.start(self.config)

    def init_pipeline(self):
        pass

    def test(self):
        try:
            while True:
                frames = self.pipeline.wait_for_frames()
                depth_frame = frames.get_depth_frame()
                if not depth_frame:
                    continue
                depth_image = np.asanyarray(depth_frame.get_data())
                depth_colormap = cv2.applyColorMap(cv2.convertScaleAbs(depth_image, alpha=0.03), cv2.COLORMAP_JET)
                cv2.namedWindow('depth', cv2.WINDOW_AUTOSIZE)
                cv2.imshow('depth', depth_colormap)
                key = cv2.waitKey(1)
                # Press esc or 'q' to close the image window
                if key & 0xFF == ord('q') or key == 27:
                    cv2.destroyAllWindows()
                    break
        finally:
            pipeline.stop()

if __name__ == '__main__':
    dc = DepthCamera()
    dc.test()
