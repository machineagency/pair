import cv2
import numpy as np

img_raw = cv2.imread('./test_images/groundtruth_iso.png')
img_gray = cv2.bitwise_not(cv2.cvtColor(img_raw, cv2.COLOR_BGR2GRAY))
ret, img_thresh = cv2.threshold(img_gray, 127, 255, 0)
img_thresh_copy = img_thresh.copy()
img_cont, contours, hierarchy = cv2.findContours(img_thresh_copy, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

cv2.drawContours(img_raw, contours, -1, (0,255,0), 3)
cv2.imshow('image', img_raw)

cv2.waitKey(0)
cv2.destroyAllWindows()

