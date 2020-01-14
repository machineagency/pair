# TODO: main file for parsing, projecting, sensing, and machine control.
# takes in a pair file as input
# TODO: bypass parsing with canned data for line example and create projection
import cv2
import screeninfo
import numpy as np
from machine import Machine
import projection

class FakeInteraction:
    def __init__(self, img):
        self.img = img
        self.length = 150
        self.spacing = 50
        self.translate_x = 50
        self.translate_y = 50
        for i in range(0, 3):
            start_pt = (self.translate_x, i * self.spacing + self.translate_y)
            end_pt = (self.length + self.translate_x, i * self.spacing + self.translate_y)
            projection.line_from_to(start_pt, end_pt, self.img)

class GuiControl:
    def __init__(self, img):
        self.img = img
        self.buttom_buttons = []

    def add_bottom_button(self, text):
        projection.rectangle_at((50, 300), 100, 50, self.img)
        projection.text_at(text, (50, 300), self.img)

    def add_bottom_button(self, text):
        # TODO: de-hardcode
        pt = (50, 300)
        text_size = projection.find_text_size(text)
        projection.rectangle_at(pt, text_size[0], text_size[1], self.img)
        projection.text_at(text, pt, self.img)

def handle_click(event, x, y, flags, param):
    def invert_y(y):
        return GRID_IMG_SIZE[1] - y;

    # TODO: this will need to match work envelope somehow
    PRINT_BED_MAX_X = 300
    PRINT_BED_MAX_Y = 300

    # TODO: way of sharing image dimensions
    GRID_IMG_SIZE = (400, 400)
    m = Machine(dry=True)

    if event == cv2.EVENT_LBUTTONDOWN:
        scaled_x = x * (PRINT_BED_MAX_X / GRID_IMG_SIZE[0])
        scaled_y = invert_y(y) * (PRINT_BED_MAX_Y / GRID_IMG_SIZE[1])
        instr = m.travel((scaled_x, scaled_y))
        print(instr)

def run_canvas_loop():
    GRID_IMG_SIZE = (400, 400)
    img_size_three_channel = GRID_IMG_SIZE + (3,)
    img = np.zeros(img_size_three_channel, np.float32)
    ixn = FakeInteraction(img)
    gui = GuiControl(img)
    cv2.namedWindow('Projection')
    cv2.setMouseCallback('Projection', handle_click)
    cv2.imshow("Projection", img)

    while True:
        pressed_key = cv2.waitKey(1)

        # Close window on Escape keypress
        if pressed_key == 27:
            break

        if pressed_key == ord('b'):
            gui.add_bottom_button('trans')

        cv2.imshow("Projection", img)
    cv2.destroyAllWindows()

def run_camera_loop():
    def rescale_frame(frame, wpercent=130, hpercent=130):
        width = int(frame.shape[1] * wpercent / 100)
        height = int(frame.shape[0] * hpercent / 100)
        return cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)

    capture = cv2.VideoCapture(0)

    while capture.isOpened():
        pressed_key = cv2.waitKey(1)
        _, frame = capture.read()

        # Close window on Escape keypress
        if pressed_key == 27:
            break

        # Example color print for one frame only
        elif pressed_key > 0 and pressed_key < 0x10FFFF:
            projection.text_at(chr(pressed_key), (100, 100), frame)

        cv2.imshow("Live Feed", rescale_frame(frame, 80, 80))

    cv2.destroyAllWindows()
    capture.release()

def main():
    run_canvas_loop()

if __name__ == '__main__':
    main()

