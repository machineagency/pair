import cv2
from cv2 import aruco
import numpy as np
from scipy.spatial import distance
import gcode
import projection

# Load images

img_raw = cv2.imread('./test_images/prusa_fiducials.JPG')
img_overlay = cv2.imread('./test_images/groundtruth_top.png')
img_overlay = cv2.cvtColor(img_overlay, cv2.COLOR_BGR2GRAY)
img_gray = cv2.cvtColor(img_raw, cv2.COLOR_BGR2GRAY)

# Constants
GRID_IMG_SIZE = (400, 400)

def get_outermost_points(corners_arr_lst, img):
    flat_corner_sets = [cset.reshape(4, 2) for cset in corners_arr_lst]
    all_points = np.concatenate(flat_corner_sets)

    img_height, img_width, _ = img.shape
    abs_upper_left = np.array([0, 0])
    abs_upper_right = np.array([0, img_width])
    dists_upper_left = [distance.euclidean(pt, abs_upper_left) \
                            for pt in all_points]
    dists_upper_right = [distance.euclidean(pt, abs_upper_right) \
                            for pt in all_points]

    idx_upper_left = np.argmin(dists_upper_left)
    idx_upper_right = np.argmin(dists_upper_right)
    idx_lower_left = np.argmax(dists_upper_right)
    idx_lower_right = np.argmax(dists_upper_left)

    return [all_points[idx_upper_right], all_points[idx_upper_left], \
            all_points[idx_lower_left], all_points[idx_lower_right]]

def get_img_corner_pts(img):
    img_height, img_width = img.shape
    return [np.array([0, img_width]), \
            np.array([0, 0]), \
            np.array([img_height, 0]), \
            np.array([img_height, img_width])]

def get_roi_corner_pts(backgr_img):
    aruco_dict = aruco.Dictionary_get(aruco.DICT_6X6_250)
    parameters =  aruco.DetectorParameters_create()
    corners, ids, rejectedImgPoints = aruco.detectMarkers(img_gray, aruco_dict, parameters=parameters)
    if len(corners) == 0:
        return []
    return get_outermost_points(corners, img_raw)

def make_poly_from_roi_pts(roi_pts):
    pts_reshaped = np.array(roi_pts, np.int32).reshape(4, 1, 2)
    return cv2.polylines(img_raw, [pts_reshaped], True, (0, 255, 0), thickness=3)

def make_img_with_warped_overlay(backgr_img, overlay_img, backgr_corner_pts):
    overlay_corner_pts = get_img_corner_pts(overlay_img)
    h, status = cv2.findHomography(np.array(overlay_corner_pts), \
                                   np.array(backgr_corner_pts))

    # Destination shape size needs to be (x, y) -> (y, x) reversed for some reason
    overlay_warped = cv2.warpPerspective(img_overlay, h, \
                        (backgr_img.shape[1], backgr_img.shape[0]))
    return cv2.addWeighted(overlay_warped, 0.5, img_gray, 0.5, 0.0)

def overlay_img_at_pt(overlay_img, large_img, place_pt):
    large_copy = large_img.copy()
    x_start = int(place_pt[0])
    y_start = int(place_pt[1])
    x_end = int(x_start + overlay_img.shape[0])
    y_end = int(y_start + overlay_img.shape[1])
    large_copy[x_start:x_end, y_start:y_end] = overlay_img
    return large_copy

def crop_and_warp_roi(raw_img, roi_corner_points, out_shape):
    output_img = np.zeros(out_shape)
    out_img_corners = get_img_corner_pts(output_img)
    h, status = cv2.findHomography(np.array(roi_corner_points, np.float32), \
                                   np.array(out_img_corners, np.float32))
    return cv2.warpPerspective(raw_img, h, (out_shape[1], \
                                            out_shape[0]))

def handle_click(event, x, y, flags, param):
    if event == cv2.EVENT_LBUTTONDOWN:
        instr = gcode.travel(x, y)
        print(instr)

cv2.namedWindow('image')
cv2.setMouseCallback('image', handle_click)

video_capture = cv2.VideoCapture(0)

while True:
    ret, frame = video_capture.read()
    img_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    out_pts = get_roi_corner_pts(img_gray)

    if len(out_pts) == 4:
        img_poly = make_poly_from_roi_pts(out_pts)
        cropped_roi = crop_and_warp_roi(img_gray, out_pts, GRID_IMG_SIZE)
        cv2.imshow('image', cropped_roi)
    else:
        cv2.imshow('image', img_gray)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()

# img_combined = make_img_with_warped_overlay(img_gray, img_overlay, out_pts)

# cv2.imshow('image', cropped_roi)

# dot_img = projection.dot_at(150, 150)
# dot_text_img = projection.text_at('hello', 200, 200, dot_img)

# cv2.namedWindow('dot', cv2.WND_PROP_FULLSCREEN)
# cv2.setWindowProperty('dot',cv2.WND_PROP_FULLSCREEN,cv2.WINDOW_FULLSCREEN)
# cv2.imshow('dot', dot_text_img)

# cv2.waitKey(0)
# cv2.destroyAllWindows()

