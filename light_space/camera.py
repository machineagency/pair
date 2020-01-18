import cv2
import numpy as np

def process_image(img_path):
    img = cv2.imread(img_path)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    img = cv2.GaussianBlur(img, (11, 11), 1, 1)
    # _, img = cv2.threshold(img, 150, 255, cv2.THRESH_BINARY)
    img = cv2.Canny(img, 50, 80)
    return img

def draw_hough_lines(edge_img, out_img):
    """
    Finds Hough lines from EDGE_IMG and draws those lines on OUT_IMG.
    Currently does not work.
    """
    minLineLength = 100
    maxLineGap = 10
    lines = cv2.HoughLinesP(edge_img, 1, np.pi / 180, 100, minLineLength,\
                            maxLineGap)
    for line in lines:
        print(line)
        x1 = line[0][0]
        x2 = line[0][1]
        y1 = line[0][2]
        y2 = line[0][3]
        cv2.line(out_img,(x1, y1),(x2, y2), (0, 255, 0), 2)

def calc_contours(edge_img):
    contours, hierarchy = cv2.findContours(edge_img, cv2.RETR_TREE,\
                                           cv2.CHAIN_APPROX_SIMPLE)
    return contours

def find_work_env_in_contours(contours):
    # TODO: contour 1 is not always the rectangle, but roll with it for now
    rect_contour = contours[1]
    # cv2.drawContours(img_orig, [rect_contour], 0, (0, 255, 0), 1)
    MAX_DIST = 100
    work_env_contour = cv2.approxPolyDP(rect_contour, MAX_DIST, True)
    if len(work_env_contour) > 4:
        # TODO: increase max dist if this happens, or something.
        print(f'Warning: work env contour has {len(work_env_contour)} points')
    return work_env_contour

def run_camera_loop(img_path):
    img_orig = cv2.imread(img_path)
    img = process_image(img_path)
    window_name = 'Camera'
    cv2.namedWindow(window_name)
    contours = calc_contours(img)
    work_env_contour = find_work_env_in_contours(contours)
    cv2.drawContours(img_orig, [work_env_contour], 0, (0, 255, 0), 1)

    cv2.imshow(window_name, img_orig)
    # cv2.imshow("edges", img)
    while True:
        pressed_key = cv2.waitKey(1)

        if pressed_key == 27:
            break

    cv2.destroyAllWindows()

def main():
    run_camera_loop('./test_images/work_env_lines.jpg')

if __name__ == '__main__':
    main()

