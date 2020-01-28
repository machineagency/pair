import cv2
import numpy as np
from scipy.spatial.distance import euclidean as dist

def process_image(img_path):
    img = cv2.imread(img_path)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    img = cv2.GaussianBlur(img, (11, 11), 1, 1)
    # _, img = cv2.threshold(img, 150, 255, cv2.THRESH_BINARY)
    img = cv2.Canny(img, 50, 80)
    return img

def draw_hough_lines(edge_img, out_img):
    """
    Finds Hough lines from EDGE_IMG and draws those lines on OUT_IMG.
    Currently does not work.
    """
    minLineLength = 100
    maxLineGap = 10
    lines = cv2.HoughLinesP(edge_img, 1, np.pi / 180, 100, minLineLength,\
                            maxLineGap)
    for line in lines:
        print(line)
        x1 = line[0][0]
        x2 = line[0][1]
        y1 = line[0][2]
        y2 = line[0][3]
        cv2.line(out_img,(x1, y1),(x2, y2), (0, 255, 0), 2)

def calc_contours(edge_img):
    contours, hierarchy = cv2.findContours(edge_img, cv2.RETR_TREE,\
                                           cv2.CHAIN_APPROX_SIMPLE)
    return contours

def decimate_contours(contours):
    MAX_DIST = 100
    return list(map(lambda c: cv2.approxPolyDP(c,\
                    MAX_DIST, True), contours))

def find_work_env_in_contours(contours):
    def select_contour(contours):
        decimated_contours = decimate_contours(contours)
        four_pt_contours = list(filter(lambda c: len(c) == 4, decimated_contours))
        max_area = 0
        candidate = None
        for contour in four_pt_contours:
            # Assumes points are ordered circularly
            contour = contour.reshape((4, 2))
            a = [contour[0][0] - contour[1][0],\
                 contour[0][1] - contour[1][1]]
            b = [contour[0][0] - contour[3][0],\
                 contour[0][1] - contour[3][1]]
            area = abs(np.cross(a, b))
            if area > max_area:
                candidate = contour
                max_area = area
        return candidate

    rect_contour = select_contour(contours)
    if len(rect_contour) > 4:
        # TODO: increase max dist if this happens, or something.
        raise ValueError('Cannot find a contour with four points.')
    return rect_contour

def calc_work_env_homog(raw_img, env_corner_points, out_shape):
    def order_contour_points(contour_pts, img_contour):
        """
        Returns a new contour (assuming 4 points) with points in the order:
        top right, top left (origin), bottom left, bottom right.
        """
        img_height, img_width, _ = img_contour.shape
        abs_upper_left = np.array([0, 0])
        abs_upper_right = np.array([0, img_width])
        dists_upper_left = [dist(pt, abs_upper_left) \
                                for pt in contour_pts]
        dists_upper_right = [dist(pt, abs_upper_right) \
                                for pt in contour_pts]

        idx_upper_left = np.argmin(dists_upper_left)
        idx_upper_right = np.argmin(dists_upper_right)
        idx_lower_left = np.argmax(dists_upper_right)
        idx_lower_right = np.argmax(dists_upper_left)

        return [contour_pts[idx_upper_right], contour_pts[idx_upper_left], \
                contour_pts[idx_lower_left], contour_pts[idx_lower_right]]

    def get_img_corner_pts(img):
        """
        Returns corner points in pixels of image in the following order:
        top right, top left (origin), bottom left, bottom right.
        """
        img_height, img_width = img.shape
        return [np.array([img_width, 0]), \
                np.array([0, 0]), \
                np.array([0, img_height]), \
                np.array([img_width, img_height])]

    if len(env_corner_points) != 4:
        raise ValueError('Cannot crop with non-four-point contour.')
    output_img = np.zeros(out_shape)
    out_img_corners = get_img_corner_pts(output_img)
    ordered_env_corner_pts = order_contour_points(env_corner_points, raw_img)
    h, status = cv2.findHomography(np.array(env_corner_points, np.float32), \
                                   np.array(out_img_corners, np.float32))
    return h

def transform_contour_with_h(contour, h):
    contour_float = np.array(contour).astype(np.float32)
    trans = cv2.perspectiveTransform(contour_float, h)
    return trans.astype(np.int32)

def run_camera_loop(img_path):
    PROJ_SCREEN_SIZE_HW = (720, 1280)
    img_orig = cv2.imread(img_path)
    img = process_image(img_path)
    window_name = 'Camera'
    cv2.namedWindow(window_name)
    contours = calc_contours(img)
    work_env_contour = find_work_env_in_contours(contours)
    cv2.drawContours(img_orig, [work_env_contour], 0, (0, 255, 0), 3)

    work_env_homog = calc_work_env_homog(img_orig, work_env_contour, PROJ_SCREEN_SIZE_HW)
    img_crop = cv2.warpPerspective(img_orig, work_env_homog, (PROJ_SCREEN_SIZE_HW[1],\
                                   PROJ_SCREEN_SIZE_HW[0]))
    img_crop_volatile = img_crop.copy()

    cv2.imshow(window_name, img_orig)
    # cv2.imshow("edges", img)
    cv2.imshow("crop", img_crop)
    curr_contour_idx = 0
    decimated_contours = decimate_contours(contours)

    while True:
        pressed_key = cv2.waitKey(1)

        if pressed_key == 27:
            break

        if pressed_key == ord('n'):
            img_crop_volatile = img_crop.copy()
            curr_contour = decimated_contours[curr_contour_idx]
            trans_contour = transform_contour_with_h(curr_contour, work_env_homog)
            cv2.drawContours(img_crop_volatile, [trans_contour],\
                             0, (255, 0, 0), 1)
            curr_contour_idx = (curr_contour_idx + 1) % len(decimated_contours)
            cv2.imshow('crop', img_crop_volatile)
            # print(f'Showing contour {curr_contour_idx}')

    cv2.destroyAllWindows()

# TODO: actually put functions into Camera class to export
class Camera:
    def __init__(self):
        self.path = 'test_images/work_env_lines.jpg'
        self.contours = []

    def calc_candidate_contours(self):
        pass

    def write_contours_to_canvas(self, canv_img):
        pass

    def user_vote_contours(self):
        # TODO: how to let user delete bad ones?
        pass

def main():
    run_camera_loop('./test_images/work_env_lines.jpg')

if __name__ == '__main__':
    main()

