# TODO: main file for parsing, projecting, sensing, and machine control.
# takes in a pair file as input
# TODO: bypass parsing with canned data for line example and create projection
import cv2
from machine import Machine
import projection

def rescale_frame(frame, wpercent=130, hpercent=130):
    width = int(frame.shape[1] * wpercent / 100)
    height = int(frame.shape[0] * hpercent / 100)
    return cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)

def main():
    capture = cv2.VideoCapture(0)

    while capture.isOpened():
        pressed_key = cv2.waitKey(1)
        _, frame = capture.read()

        cv2.imshow("Live Feed", rescale_frame(frame, 80, 80))

        if pressed_key == 27:
            break

    cv2.destroyAllWindows()
    capture.release()


if __name__ == '__main__':
    main()

