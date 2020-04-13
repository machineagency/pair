import pyrealsense2 as rs
import numpy as np
import cv2
import time, math

class DepthCamera():
    def __init__(self):
        self.OFFLINE = False
        self.MIN_SIZE_HAND = 16000
        self.img_height = 480
        self.img_width = 640
        if not self.OFFLINE:
            self.pipeline = rs.pipeline()
            self.config = rs.config()
            self.config.enable_stream(rs.stream.depth, self.img_width,\
                                        self.img_height,rs.format.z16, 30)
            self.config.enable_stream(rs.stream.color, self.img_width,\
                                        self.img_height,rs.format.bgr8, 30)
            self.profile = self.pipeline.start(self.config)
        self.saved_image_count = 0

    def set_baseline_edge_depth_images(self):
        print('Initializing baseline edge and depth images.')
        sum_edge = np.zeros((self.img_height, self.img_width))
        sum_depth = np.zeros((self.img_height, self.img_width))
        sumsq_edge = np.zeros((self.img_height, self.img_width))
        sumsq_depth = np.zeros((self.img_height, self.img_width))
        GATHERING_FPS = 20
        GATHERING_TIME = 2
        n = GATHERING_FPS * GATHERING_TIME
        # https://en.wikipedia.org/wiki/Algorithms_for_calculating\
        # _variance#Computing_shifted_data
        k = 1.0
        for _ in range(n):
            edge, depth = self.get_edge_and_depth_images()
            edgesq = (edge - k) ** 2
            depthsq = (depth - k) ** 2
            sum_edge += edge - k
            sum_depth += depth - k
            sumsq_edge += edgesq
            sumsq_depth += depthsq
            time.sleep(1 / GATHERING_FPS)
        self.mean_edge = sum_edge / n
        self.mean_depth = sum_depth / n
        self.stddev_edge = np.sqrt((sumsq_edge - (sum_edge ** 2) / n) / (n - 1))
        self.stddev_depth = np.sqrt((sumsq_depth - (sum_depth ** 2) / n) / (n - 1))
        print('Set baseline edge and depth images.')

    def get_hand_blob_img(self, img):
        # Assumes a backgrounded depth image: mean - sample
        # Positive pixel values indicate objects closer to the camera
        # Than the background
        img_low = np.zeros((self.img_height, self.img_width))
        img_high = 255 * np.ones((self.img_height, self.img_width))
        s = self.stddev_depth
        thresh_mm = 12
        raw_blobs = np.where(img >= thresh_mm, img_high, img_low)
        return raw_blobs

    def cull_blobs(self, blob_img):
        """
        Takes an image with blobs and returns an image with only blobs
        of a minimum pixel size remaining.
        Runs flood fill algorithm to explore blobs.
        """
        visited = np.zeros(blob_img.shape)
        running_img = np.zeros(blob_img.shape)
        queue = []
        clear_queue = []
        max_x_idx = blob_img.shape[0] - 1
        max_y_idx = blob_img.shape[1] - 1
        for y_start in range(blob_img.shape[1]):
            for x_start in range(blob_img.shape[0]):
                if visited[x_start, y_start]:
                    continue
                queue.append((x_start, y_start))
                blob_size = 0
                while len(queue) > 0:
                    x, y = queue.pop(0)
                    if x < 0 or x > max_x_idx or y < 0 or y > max_x_idx\
                        or visited[x, y] == 1:
                        continue
                    visited[x, y] = 1
                    if blob_img[x, y] != 0:
                        blob_size += 1
                        running_img[x, y] = 255
                        clear_queue.append((x, y))
                        queue.append((x - 1, y))
                        queue.append((x + 1, y))
                        queue.append((x, y - 1))
                        queue.append((x, y + 1))
                if blob_size >= self.MIN_SIZE_HAND:
                    print(f'{x_start, y_start}: {blob_size}')
                    return running_img
                else:
                    while len(clear_queue) > 0:
                        x, y = clear_queue.pop(0)
                        running_img[x, y] = 0
        return np.zeros(blob_img.shape)

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
            self.set_baseline_edge_depth_images()
            while True:
                # NOTE: edge and depth images are calculated against mean images
                # in reverse ways
                edge_image_raw, depth_image_raw = self.get_edge_and_depth_images()
                # Raw edges will have a higher value than the mean because
                # edges are higher values
                edge_image = edge_image_raw - self.mean_edge
                # Raw depth will have lower values than mean depth because
                # objects are closer to the camera
                depth_image = self.mean_depth - depth_image_raw
                if edge_image is None or depth_image is None:
                    continue
                edge_colormap = cv2.applyColorMap(cv2.convertScaleAbs(edge_image, alpha=0.10), cv2.COLORMAP_JET)
                depth_colormap = cv2.applyColorMap(cv2.convertScaleAbs(depth_image, alpha=0.03), cv2.COLORMAP_JET)
                cv2.namedWindow('depth', cv2.WINDOW_AUTOSIZE)
                cv2.namedWindow('edges', cv2.WINDOW_AUTOSIZE)
                cv2.namedWindow('hand_blob', cv2.WINDOW_AUTOSIZE)
                cv2.moveWindow('depth', self.img_width, 0)
                cv2.moveWindow('hand_blob', 0, self.img_height)
                cv2.imshow('depth', depth_colormap)
                cv2.imshow('edges', edge_colormap)
                raw_blob_image = self.get_hand_blob_img(depth_image)
                culled_blob_image = self.cull_blobs(raw_blob_image)
                cv2.imshow('hand_blob', culled_blob_image)

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

