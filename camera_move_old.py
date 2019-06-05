import cv2
import numpy as np

img_raw = cv2.imread('./test_images/prusa_iso.JPG')
img_gray = cv2.bitwise_not(cv2.cvtColor(img_raw, cv2.COLOR_BGR2GRAY))

kernel = np.ones((4,4),np.uint8)
erosion = cv2.erode(img_gray,kernel,iterations = 2)
kernel = np.ones((4,4),np.uint8)
dilation = cv2.dilate(erosion,kernel,iterations = 2)

img_thresh = cv2.adaptiveThreshold(dilation, 255, \
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)

edges = cv2.Canny(dilation, 25, 100, 2)
img_cont, contours, hierarchy = cv2.findContours(img_thresh, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

cnt_reduced = list(filter(lambda cnt: cv2.contourArea(cnt) > 10000, contours))

print "Num of contours: {}".format(len(contours))
print "After reduction: {}".format(len(cnt_reduced))

print cv2.contourArea(contours[0])

cv2.drawContours(img_raw, cnt_reduced, -1, (0,255,0), 1)
cv2.imshow('image', img_raw)

cv2.waitKey(0)
cv2.destroyAllWindows()

