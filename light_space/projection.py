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

def line_from_to(p0, p1, color_name='red', img=None):
    if img is None:
        img_size_three_channel = GRID_IMG_SIZE + (3,)
        img = np.zeros(img_size_three_channel, np.float32)
    if color_name == 'white':
        color = (255, 255, 255)
    elif color_name == 'green':
        color = (0, 255, 0)
    elif color_name == 'red':
        color = (0, 0, 255)
    else:
        color = (255, 255, 255)
    thickness = 5
    p0 = (int(round(p0[0])), int(round(p0[1])))
    p1 = (int(round(p1[0])), int(round(p1[1])))
    return cv2.line(img, p0, p1, color, thickness, cv2.LINE_AA)

def rectangle_at(pt, width, height, img):
    """
    Creates a rectangle whose top left corner is at PT, with WIDTH (delta X)
    and HEIGHT (delta Y).
    """
    end_pt = (pt[0] + width, pt[1] + height)
    color = (0, 0, 255)
    thickness = cv2.FILLED
    return cv2.rectangle(img, pt, end_pt, color, thickness)

def text_at(text, pt, color_name='white', img=None):
    """
    Creates text where PT is top left corner (not bottom left).
    """
    if img is None:
        img_size_three_channel = GRID_IMG_SIZE + (3,)
        img = np.zeros(img_size_three_channel, np.float32)
    if color_name == 'white':
        color = (255, 255, 255)
    elif color_name == 'black':
        color = (0, 0, 0)
    elif color_name == 'red':
        color = (0, 0, 255)
    else:
        color = (255, 255, 255)

    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 1
    thickness = 3
    bbox, _ = cv2.getTextSize(text, font, font_scale, thickness)
    y_offset = bbox[1]
    translated_pt = (pt[0], pt[1] + y_offset)
    cv2.putText(img, text, translated_pt, font, font_scale, color, \
                       thickness, cv2.LINE_AA)

def find_text_size(text):
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 1
    font_color = (255, 255, 255)
    thickness = 3
    bbox, _ = cv2.getTextSize(text, font, font_scale, thickness)
    return bbox

