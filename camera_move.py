import cv2
from cv2 import aruco
import numpy as np
from scipy.spatial import distance

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

img_raw = cv2.imread('./test_images/prusa_fiducials.JPG')
img_overlay = cv2.imread('./test_images/groundtruth_top.png')
img_overlay = cv2.cvtColor(img_overlay, cv2.COLOR_BGR2GRAY)
img_gray = cv2.cvtColor(img_raw, cv2.COLOR_BGR2GRAY)

aruco_dict = aruco.Dictionary_get(aruco.DICT_6X6_250)
parameters =  aruco.DetectorParameters_create()
corners, ids, rejectedImgPoints = aruco.detectMarkers(img_gray, aruco_dict, parameters=parameters)
# frame_markers = aruco.drawDetectedMarkers(img_raw.copy(), corners, ids)

out_pts = get_outermost_points(corners, img_raw)
pts_reshaped = np.array(out_pts, np.int32).reshape(4, 1, 2)
img_poly = cv2.polylines(img_raw, [pts_reshaped], True, (0, 255, 0), thickness=3)

def make_img_with_warped_overlay(backgr_img, overlay_img, backgr_corner_pts):
    overlay_height, overlay_width = overlay_img.shape
    overlay_corner_pts = [np.array([0, overlay_width]), \
                          np.array([0, 0]), \
                          np.array([overlay_height, 0]), \
                          np.array([overlay_height, overlay_width])]

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

img_combined = make_img_with_warped_overlay(img_gray, img_overlay, out_pts)

cv2.imshow('image', img_combined)

cv2.waitKey(0)
cv2.destroyAllWindows()

