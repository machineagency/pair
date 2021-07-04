import pyrealsense2 as rs
import numpy as np
import cv2
import time, math
from skimage.measure import block_reduce
import pickle

class DepthCamera():
    def __init__(self):
        self.OFFLINE = False
        self.MIN_SIZE_HAND = 500

        # Set these hyperparameters based on what looks like a good
        # segmentation for a given session.
        self.MAX_HAND_HEIGHT = 100
        self.HAND_FINGER_DEPTH_THRESH = 50
        self.FINGER_TIP_DEPTH_THRESH = 15
        # self.CANNY_LOW = 30
        # self.CANNY_HIGH = 50
        self.CANNY_LOW = 75
        self.CANNY_HIGH = 100

        self.MIN_DEPTH_Z_SCORE = 2

        self.MIN_EDGE_THRESH = 10

        # Channel values for blob image
        self.HAND_VALUE = 255
        self.FINGER_VALUE = 192
        self.TIP_VALUE = 96

        # Prescan every depth image and reject if the amount of valid pixels
        # Is lower than this amount. If this is set too high, we might
        # Reject true positives.
        self.EARLY_REJECT_BLOB = 100
        self.DOWN_FACTOR = 2

        # Load homography from previous calibration
        try:
            f = open('./calibration/homography.pckl', 'rb')
            self.h, self.img_width, self.img_height = pickle.load(f)
            f.close()
            self.img_width = self.img_width // 1
            self.img_height = self.img_height // 1
            # self.img_width = 640
            # self.img_height = 480
            print('Loading homography with camera img size')
            print(self.img_width, self.img_height)
            # print('to projector img size')
        except Exception as e:
            print('Could not load homography.')
            print(e)
            self.h = np.identity(3)
            self.img_width = 640
            self.img_height = 480

        self.recent_centroid = (0, 0)
        if not self.OFFLINE:
            self.pipeline = rs.pipeline()
            self.config = rs.config()
            self.config.enable_stream(rs.stream.depth, self.img_width,\
                                        self.img_height,rs.format.z16, 30)
            self.config.enable_stream(rs.stream.infrared, self.img_width,\
                                        self.img_height,rs.format.bgr8, 30)
            self.profile = self.pipeline.start(self.config)
            # Align depth frame to color frame
            self.align_to = rs.stream.color
            self.align = rs.align(self.align_to)
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
        self.mean_edge = (sum_edge / n)
        self.mean_depth = self.downsample(sum_depth / n)
        self.stddev_edge = (np.sqrt(\
                                (sumsq_edge - (sum_edge ** 2) / n) / (n - 1)))
        self.stddev_depth = self.downsample(np.sqrt(\
                                (sumsq_depth - (sum_depth ** 2) / n) / (n - 1)))
        print('Set baseline edge and depth images.')

    def downsample(self, img):
        return block_reduce(img, block_size=(self.DOWN_FACTOR, \
                            self.DOWN_FACTOR), func=np.mean)

    def fix_edge_img(self, edge_img):
        edge_img = edge_img# - self.mean_edge
        eps = 1
        z = 2
        edge_img = np.where(np.logical_and(\
            edge_img >= self.MIN_EDGE_THRESH,\
            edge_img >= z * self.stddev_edge + eps), 255, 0)
        new_edge_img = edge_img.copy()
        # for y in range(edge_img.shape[1]):
        #     for x in range(edge_img.shape[0]):
        #         new_edge_img[x, y] = edge_img[x, y]
        #         try:
        #             if edge_img[x, y] == 0:
        #                 neighbor_values = [
        #                     edge_img[x - 1, y] > 0, \
        #                     edge_img[x + 1, y] > 0, \
        #                     edge_img[x, y - 1] > 0, \
        #                     edge_img[x, y + 1] > 0, \
        #                     edge_img[x + 1, y + 1] > 0, \
        #                     edge_img[x + 1, y - 1] > 0, \
        #                     edge_img[x - 1, y + 1] > 0, \
        #                     edge_img[x - 1, y - 1] > 0
        #                 ]
        #                 num_over = len(list(filter(lambda b: b, neighbor_values)))
        #                 if num_over >= 2:
        #                     new_edge_img[x, y] = 255
        #         except IndexError:
        #             continue
        return new_edge_img

    def get_hand_blob_img(self, img):
        # Assumes a backgrounded depth image: mean - sample
        # Positive pixel values indicate objects closer to the camera
        # Than the background
        img_low = np.zeros(img.shape)
        img_high = 255 * np.ones(img.shape)
        # thresh_mm = 12
        # raw_blobs = np.where(img >= self.stddev_depth, img_high, img_low)
        raw_blobs = np.where(np.logical_and(\
                    img >= self.MIN_DEPTH_Z_SCORE * self.stddev_depth,\
                    img < self.MAX_HAND_HEIGHT), img_high, img_low)
        return raw_blobs

    def cull_blobs(self, blob_img, edge_img, depth_img):
        """
        Takes an image with blobs and returns an image with only blobs
        of a minimum pixel size remaining.
        Runs flood fill algorithm to explore blobs.
        """
        def pixel_is_gap(edge_img, x, y):
            try:
                # pixel_is_edge = edge_img[x, y] > 0
                # return pixel_is_edge
                # NOTE: commenting out neighbor checking for now, seems
                # to do more harm than good
                box_values = [
                    edge_img[x, y] > 0, \
                    edge_img[x - 1, y] > 0, \
                    edge_img[x + 1, y] > 0, \
                    edge_img[x, y - 1] > 0, \
                    edge_img[x, y + 1] > 0, \
                    edge_img[x + 1, y + 1] > 0, \
                    edge_img[x + 1, y - 1] > 0, \
                    edge_img[x - 1, y + 1] > 0, \
                    edge_img[x - 1, y - 1] > 0
                ]
                num_over = len(list(filter(lambda b: b, box_values)))
                min_over = 1
                return num_over >= min_over
            except IndexError:
                return True

        if np.count_nonzero(blob_img) < self.EARLY_REJECT_BLOB:
            # print('Reject from low pixel count.')
            return np.zeros(blob_img.shape)

        visited = np.zeros(blob_img.shape)
        running_img = np.zeros(blob_img.shape)
        queue = []
        clear_queue = []
        max_x_idx = blob_img.shape[0] - 1
        max_y_idx = blob_img.shape[1] - 1
        x_range = [self.recent_centroid[0]] + list(range(blob_img.shape[0]))
        y_range = [self.recent_centroid[1]] + list(range(blob_img.shape[1]))
        for y_start in y_range:
            for x_start in x_range:
                if visited[x_start, y_start]:
                    continue
                queue.append((x_start, y_start))
                blob_size = 0
                while len(queue) > 0:
                    x, y = queue.pop(0)
                    if x < 0 or x > max_x_idx or y < 0 or y > max_y_idx\
                        or visited[x, y] == 1:
                        continue
                    visited[x, y] = 1
                    if edge_img[x, y] > 0:
                        continue
                    if blob_img[x, y] != 0:
                        blob_size += 1
                        if depth_img[x, y] >= self.HAND_FINGER_DEPTH_THRESH:
                            running_img[x, y] = self.HAND_VALUE
                        elif depth_img[x, y] > self.FINGER_TIP_DEPTH_THRESH:
                            running_img[x, y] = self.FINGER_VALUE
                        elif depth_img[x, y] > 1.5 * self.stddev_depth[x, y]:
                            # TODO: put these guys somewhere to get touch
                            # event. For now maybe just take the max size
                            # blob and get its centroid.
                            running_img[x, y] = self.TIP_VALUE
                        clear_queue.append((x, y))
                        if not pixel_is_gap(edge_img, x, y):
                            queue.append((x - 1, y))
                            queue.append((x + 1, y))
                            queue.append((x, y - 1))
                            queue.append((x, y + 1))
                if blob_size >= self.MIN_SIZE_HAND:
                    moments = cv2.moments(running_img)
                    cy = int(moments['m10'] / moments['m00'])
                    cx = int(moments['m01'] / moments['m00'])
                    self.recent_centroid = (cx, cy)
                    # print(f'{blob_size} @ {(cx, cy)}')
                    return running_img
                else:
                    while len(clear_queue) > 0:
                        x, y = clear_queue.pop(0)
                        running_img[x, y] = 0
        return np.zeros(blob_img.shape)

    def find_tips_in_culled_blob_image(self, blob_img):
        def check_mu(mu):
            min_area = 4
            max_area = 144
            max_eccen = 0.9
            try:
                mp20 = mu['mu20'] / mu['m00']
                mp02 = mu['mu02'] / mu['m00']
                mp11 = mu['mu11'] / mu['m00']

                la = 0.5 * ((mp20 + mp02) + (4 * mp11 ** 2 \
                                + (mp20 - mp02) ** 2) ** (0.5))
                lb = 0.5 * ((mp20 + mp02) - (4 * mp11 ** 2 \
                                + (mp20 - mp02) ** 2) ** (0.5))
                area = 4 * (abs(la * lb)) ** 0.5
                eccen = (1 - lb / la) ** 0.5
                return area >= min_area and area <= max_area \
                        and eccen <= max_eccen
            except ZeroDivisionError:
                return False

        def calc_center(mu):
            c_raw = np.array([mu['m10'] / (mu['m00'] + 1e-5), \
                              mu['m01'] / (mu['m00'] + 1e-5),
                              1])
            c_raw = c_raw * self.DOWN_FACTOR
            c = self.h.dot(c_raw)
            # c = c_raw
            return (c[0], c[1])

        tips_img = np.where(blob_img == self.TIP_VALUE, 255, 0).astype(np.uint8)
        _, contours, _ = cv2.findContours(tips_img, cv2.RETR_TREE, \
                                cv2.CHAIN_APPROX_SIMPLE)
        mus = [cv2.moments(c) for c in contours]
        centers = [calc_center(mu) for mu in mus if check_mu(mu)]
        return centers

    def smooth_image(self, img):
        return cv2.GaussianBlur(img, (3, 3), 1, 1)

    def compute_canny(self, img):
        img_canny = cv2.Canny(img, self.CANNY_LOW, self.CANNY_HIGH,\
                2, apertureSize=3, L2gradient=True)
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
        aligned_frames = self.align.process(frames)
        depth_frame = aligned_frames.get_depth_frame()
        color_frame = aligned_frames.get_infrared_frame()
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
                # TODO: sliding window
                # Raw edges will have a higher value than the mean because
                # edges are higher values
                edge_image = self.fix_edge_img(edge_image_raw)
                edge_image = self.downsample(edge_image)
                # Raw depth will have lower values than mean depth because
                # objects are closer to the camera
                depth_image = self.mean_depth - self.downsample(depth_image_raw)
                if edge_image is None or depth_image is None:
                    continue
                edge_colormap = cv2.applyColorMap(cv2.convertScaleAbs(edge_image, alpha=0.10), cv2.COLORMAP_JET)
                depth_colormap = cv2.applyColorMap(cv2.convertScaleAbs(depth_image, alpha=0.03), cv2.COLORMAP_JET)
                cv2.namedWindow('depth', cv2.WINDOW_AUTOSIZE)
                cv2.namedWindow('edges', cv2.WINDOW_AUTOSIZE)
                cv2.namedWindow('raw_blob', cv2.WINDOW_AUTOSIZE)
                cv2.namedWindow('hand_blob', cv2.WINDOW_AUTOSIZE)
                cv2.moveWindow('depth', edge_image.shape[0], 0)
                cv2.moveWindow('hand_blob', 0, edge_image.shape[1])
                cv2.moveWindow('raw_blob', edge_image.shape[0], edge_image.shape[1])
                cv2.imshow('depth', depth_colormap)
                cv2.imshow('edges', edge_colormap)
                raw_blob_image = self.get_hand_blob_img(depth_image)
                culled_blob_image = self.cull_blobs(raw_blob_image, edge_image,\
                                                    depth_image)
                tips = self.find_tips_in_culled_blob_image(culled_blob_image)
                print(tips)
                culled_map = cv2.applyColorMap(cv2.convertScaleAbs(culled_blob_image,\
                                alpha=1.0), cv2.COLORMAP_RAINBOW)
                cv2.imshow('hand_blob', culled_map)
                cv2.imshow('raw_blob', raw_blob_image)

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

