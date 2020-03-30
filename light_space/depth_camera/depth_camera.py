import pyrealsense2 as rs
import numpy as np
import cv2

class Stack():
    # TODO: implement with fixed memory sized python array type
    # once we know what type elements are going in
    def __init__(self):
        self.lst = []
        self.size = 0

    def push(self, el):
        self.size += 1
        self.lst.append(el)
        return el

    def pop(self):
        self.size -= 1
        return self.lst.pop()

    def size(self):
        return self.size

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

    def smooth_image(self, img):
        return cv2.GaussianBlur(img, (3, 3), 1, 1)

    def compute_canny(self, img):
        img_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        img_canny = cv2.Canny(img_gray, 200, 300)
        return img_canny

    def compute_sobel_gradients(self, depth_img):
        sobel_x = cv2.Sobel(depth_img, cv2.CV_64F, 1, 0, ksize=7)
        sobel_y = cv2.Sobel(depth_img, cv2.CV_64F, 0, 1, ksize=7)
        return (sobel_x, sobel_y)

    def compute_cylinder_slices(self, sobel_gradients):
        sobel_x, sobel_y = sobel_gradients
        px_rows, px_cols = sobel_x.shape
        def compute_slices(img):
            for idx_row in range(px_rows):
                rlst = []
                for idx_col in range(px_cols):
                    px_grad = img[idx_row, idx_col]
                    rlst.append(px_grad)

                rlst.sort()
                min_idx = 0
                max_idx = len(rlst) - 1
                iqrl_idx = round(px_cols * 0.25)
                iqru_idx = round(px_cols * 0.50)
                medn_idx = round(px_cols * 0.75)
                print(f'({rlst[min_idx]}, {rlst[iqrl_idx]}, {rlst[medn_idx]}, {rlst[iqru_idx]} {rlst[max_idx]})')
                # TODO, perhaps set IQR as min/max thresholds?
        slices_x = compute_slices(sobel_x)
        print(slices_x)
        return None

    def load_image(self, filepath):
        return np.load(filepath)

    def save_image(self, img, title=''):
        np.save(f'{title}_img_{self.saved_image_count}', img)
        self.saved_image_count += 1

    def test(self):
        try:
            while True:
                if self.OFFLINE:
                    color_image = self.load_image('samples/color_img.npy')
                    depth_image = self.load_image('samples/depth_img.npy')
                else:
                    frames = self.pipeline.wait_for_frames()
                    depth_frame = frames.get_depth_frame()
                    color_frame = frames.get_color_frame()
                    if not depth_frame or not color_frame:
                        continue
                    depth_image = np.asanyarray(depth_frame.get_data())
                    color_image_raw = np.asanyarray(color_frame.get_data())
                    color_image = self.compute_canny(color_image_raw)
                depth_colormap = cv2.applyColorMap(cv2.convertScaleAbs(depth_image, alpha=0.03), cv2.COLORMAP_JET)
                cv2.namedWindow('depth', cv2.WINDOW_AUTOSIZE)
                cv2.namedWindow('edges', cv2.WINDOW_AUTOSIZE)
                cv2.imshow('depth', depth_colormap)
                cv2.imshow('edges', color_image)

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

