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

    return [all_points[idx_upper_left], all_points[idx_upper_right], \
            all_points[idx_lower_left], all_points[idx_lower_right]]

img_raw = cv2.imread('./test_images/prusa_fiducials.JPG')
img_gray = cv2.cvtColor(img_raw, cv2.COLOR_BGR2GRAY)

aruco_dict = aruco.Dictionary_get(aruco.DICT_6X6_250)
parameters =  aruco.DetectorParameters_create()
corners, ids, rejectedImgPoints = aruco.detectMarkers(img_gray, aruco_dict, parameters=parameters)
# frame_markers = aruco.drawDetectedMarkers(img_raw.copy(), corners, ids)

out_pts = get_outermost_points(corners, img_raw)
pts_reshaped = np.array(out_pts, np.int32).reshape(4, 1, 2)
img_poly = cv2.polylines(img_raw, [pts_reshaped], True, (0, 255, 0), thickness=3)

cv2.imshow('image', img_poly)

cv2.waitKey(0)
cv2.destroyAllWindows()

