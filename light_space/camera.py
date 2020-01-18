import cv2

img_raw = cv2.imread('./test_images/work_env_lines.jpg')

window_name = 'Camera'
cv2.namedWindow(window_name)
cv2.imshow(window_name, img_raw)

def run_camera_loop():
    while True:
        pressed_key = cv2.waitKey(1)

        if pressed_key == 27:
            break

    cv2.destroyAllWindows()

def main():
    run_camera_loop()

if __name__ == '__main__':
    main()

