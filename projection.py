import cv2
import numpy as np

GRID_IMG_SIZE = (400, 400)

def dot_at(x, y, img=None):
    if img is None:
        img_size_three_channel = GRID_IMG_SIZE + (3,)
        img = np.zeros(img_size_three_channel, np.float32)
    radius = 1
    dot_color = (0, 0, 255)
    return cv2.circle(img, (x, y), radius, dot_color, -1)

def text():
    # TODO: clean up
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(img, 'OpenCV', (10,500), font, 4,(255,255,255),2,cv2.LINE_AA)

