import cv2
import numpy as np

def dot_at(x, y, img_size):
    img = np.zeros(img_size, np.uint8)
    radius = 100
    dot_color = (0, 0, 255)
    # img_dot = cv2.circle(img, (x, y), radius, dot_color, -1)
    # return img_dot
    return cv2.circle(img,(247,63), 63, (0,0,255), -1)

def text():
    # TODO: clean up
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(img, 'OpenCV', (10,500), font, 4,(255,255,255),2,cv2.LINE_AA)

