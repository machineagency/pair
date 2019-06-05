import cv2
from cv2 import aruco
import numpy as np

img_raw = cv2.imread('./test_images/prusa_fiducials.JPG')
img_gray = cv2.cvtColor(img_raw, cv2.COLOR_BGR2GRAY)

aruco_dict = aruco.Dictionary_get(aruco.DICT_6X6_250)
parameters =  aruco.DetectorParameters_create()
corners, ids, rejectedImgPoints = aruco.detectMarkers(img_gray, aruco_dict, parameters=parameters)
frame_markers = aruco.drawDetectedMarkers(img_raw.copy(), corners, ids)

cv2.imshow('image', frame_markers)

cv2.waitKey(0)
cv2.destroyAllWindows()

