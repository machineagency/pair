import pyrealsense2 as rs
import numpy as np
import cv2

class DepthCamera():
    def __init__(self):
        self.OFFLINE = False
        if not self.OFFLINE:
            self.pipeline = rs.pipeline()
            self.config = rs.config()
            self.config.enable_stream(rs.stream.depth, 640, 480,\
                                        rs.format.z16, 30)
            self.config.enable_stream(rs.stream.color, 640, 480,\
                                        rs.format.bgr8, 30)
            self.profile = self.pipeline.start(self.config)
        self.saved_image_count = 0

    def get_baseline_edge_depth_images(self):
        print('Initializing baseline edge and depth images.')
        # TODO: for n seconds (how to get FPS?) or just n times
        # record edge and depth images and add them together,
        # normalize at the end and return
        # Use mean and std dev

    def compute_edges_against_baseline(self):
        # TODO: subtract existing edges, np.where
        pass

    def compute_depth_against_baseline(self):
        # TODO: subtract background depth, np.where
        pass

    def smooth_image(self, img):
        return cv2.GaussianBlur(img, (3, 3), 1, 1)

    def compute_canny(self, img):
        img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        img_canny = cv2.Canny(img_gray, 100, 300)
        return img_canny

    def load_image(self, filepath):
        return np.load(filepath)

    def save_image(self, img, title=''):
        np.save(f'{title}_img_{self.saved_image_count}', img)
        self.saved_image_count += 1

    def get_edge_and_depth_images(self):
        if self.OFFLINE:
            color_image = self.load_image('samples/color_img.npy')
            depth_image = self.load_image('samples/depth_img.npy')
            edge_image = self.compute_canny(color_image_raw)
            return (edge_image, depth_image)
        frames = self.pipeline.wait_for_frames()
        depth_frame = frames.get_depth_frame()
        color_frame = frames.get_color_frame()
        if not depth_frame or not color_frame:
            return (None, None)
        depth_image = np.asanyarray(depth_frame.get_data())
        color_image_raw = np.asanyarray(color_frame.get_data())
        edge_image = self.compute_canny(color_image_raw)
        return (edge_image, depth_image)

    def test(self):
        try:
            while True:
                edge_image, depth_image = self.get_edge_and_depth_images()
                if edge_image is None or depth_image is None:
                    continue
                depth_colormap = cv2.applyColorMap(cv2.convertScaleAbs(depth_image, alpha=0.03), cv2.COLORMAP_JET)
                cv2.namedWindow('depth', cv2.WINDOW_AUTOSIZE)
                cv2.namedWindow('edges', cv2.WINDOW_AUTOSIZE)
                cv2.moveWindow('depth', 640, 0)
                cv2.imshow('depth', depth_colormap)
                cv2.imshow('edges', edge_image)

                key = cv2.waitKey(1)

                # Press esc or 'q' to close the image window
                if key & 0xFF == ord('q') or key == 27:
                    cv2.destroyAllWindows()
                    break
                elif key == ord('s'):
                    self.save_image(color_image, 'color')
                    self.save_image(depth_image, 'depth')
        finally:
            if not self.OFFLINE:
                self.pipeline.stop()

if __name__ == '__main__':
    dc = DepthCamera()
    dc.test()

