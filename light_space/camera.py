import cv2

def process_image(img_path):
    img_raw = cv2.imread(img_path)
    img_gray = cv2.cvtColor(img_raw, cv2.COLOR_BGR2GRAY)
    return img_gray

def run_camera_loop(img_path):
    img = process_image(img_path)
    window_name = 'Camera'
    cv2.namedWindow(window_name)
    cv2.imshow(window_name, img)
    while True:
        pressed_key = cv2.waitKey(1)

        if pressed_key == 27:
            break

    cv2.destroyAllWindows()

def main():
    run_camera_loop('./test_images/work_env_lines.jpg')

if __name__ == '__main__':
    main()

