import cv2
import numpy as np

img_raw = cv2.imread('./test_images/ulti_iso.JPG')
img_gray = cv2.bitwise_not(cv2.cvtColor(img_raw, cv2.COLOR_BGR2GRAY))
# img_thresh = cv2.adaptiveThreshold(img_gray, 255, \
#         cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
# img_thresh_copy = img_thresh.copy()

kernel = np.ones((5,5),np.uint8)
erosion = cv2.erode(img_gray,kernel,iterations = 2)
kernel = np.ones((4,4),np.uint8)
dilation = cv2.dilate(erosion,kernel,iterations = 2)

edges = cv2.Canny(dilation, 200, 300, 2)
img_cont, contours, hierarchy = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

print "Num of contours: {}".format(len(contours))

# cv2.drawContours(img_raw, contours, -1, (0,255,0), 3)
cv2.imshow('image', dilation)

cv2.waitKey(0)
cv2.destroyAllWindows()

