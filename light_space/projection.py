import cv2
import numpy as np

GRID_IMG_SIZE = (400, 400)

def dot_at(pt, img=None):
    if img is None:
        img_size_three_channel = GRID_IMG_SIZE + (3,)
        img = np.zeros(img_size_three_channel, np.float32)
    radius = 1
    dot_color = (0, 0, 255)
    return cv2.circle(img, pt, radius, dot_color, -1)

def line_from_to(p0, p1, img=None):
    if img is None:
        img_size_three_channel = GRID_IMG_SIZE + (3,)
        img = np.zeros(img_size_three_channel, np.float32)
    thickness = 1
    dot_color = (0, 0, 255)
    return cv2.line(p0, p1, line_color, thickness, CV_AA)

def text_at(text, pt, img=None):
    if img is None:
        img_size_three_channel = GRID_IMG_SIZE + (3,)
        img = np.zeros(img_size_three_channel, np.float32)
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 1
    font_color = (255, 255, 255)
    thickness = 1
    return cv2.putText(img, text, pt, font, font_scale, font_color, \
                       thickness, cv2.LINE_AA)

