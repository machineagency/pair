# TODO: main file for parsing, projecting, sensing, and machine control.
# takes in a pair file as input
# TODO: bypass parsing with canned data for line example and create projection
import cv2
import numpy as np
from machine import Machine
import projection

class FakeInteraction:
    def __init__(self, img, screen_size):
        self.m = Machine(dry=False)
        self.img = img
        self.length = screen_size[1] // 2
        self.spacing = screen_size[0] // 5
        self.translate_x = screen_size[1] // 4
        self.translate_y = screen_size[0] // 4
        for i in range(0, 3):
            start_pt = (self.translate_x, i * self.spacing + self.translate_y)
            end_pt = (self.length + self.translate_x, i * self.spacing + self.translate_y)
            projection.line_from_to(start_pt, end_pt, self.img)


class GuiControl:
    def __init__(self, img, screen_size):
        self.img = img
        self.bottom_buttons = []

        self.button_params = {\
            'start_pt' : (screen_size[1] // 4, screen_size[0] - screen_size[0] // 4),\
            'gutter' : 50\
        }

    def add_bottom_button(self, text):
        text_size = projection.find_text_size(text)
        x_offset = len(self.bottom_buttons) *\
                   (text_size[0] + self.button_params['gutter'])
        pt = (self.button_params['start_pt'][0] + x_offset,\
              self.button_params['start_pt'][1])
        rect_obj = projection.rectangle_at(pt, text_size[0], text_size[1], self.img)
        text_obj = projection.text_at(text, pt, 'black', self.img)
        self.bottom_buttons.append((rect_obj, text_obj))

def make_machine_click_handler(machine):
    def handle_click(event, x, y, flags, param):
        def invert_y(y):
            """
            Use if plotter is facing same side as projection
            """
            return GRID_IMG_SIZE[1] - y;

        # TODO: this will need to match work envelope somehow
        PRINT_BED_MAX_X = 30
        PRINT_BED_MAX_Y = 20
        SCALING = 0.1

        # TODO: way of sharing image dimensions
        GRID_IMG_SIZE = (720, 1280)

        if event == cv2.EVENT_LBUTTONDOWN:
            scaled_x = x * (PRINT_BED_MAX_X / GRID_IMG_SIZE[0]) * SCALING
            scaled_y = y * (PRINT_BED_MAX_Y / GRID_IMG_SIZE[1]) * SCALING
            scaled_x = round(scaled_x, 2)
            scaled_y = round(scaled_y, 2)
            instr = machine.travel((scaled_x, scaled_y))
            print(instr)

    return handle_click

def run_canvas_loop():
    MAC_SCREEN_SIZE_HW = (900, 1440)
    PROJ_SCREEN_SIZE_HW = (720, 1280)
    img_size_three_channel = PROJ_SCREEN_SIZE_HW + (3,)
    img = np.zeros(img_size_three_channel, np.float32)
    window_name = 'Projection'
    cv2.namedWindow(window_name)
    cv2.moveWindow(window_name, MAC_SCREEN_SIZE_HW[1], 0)
    ixn = FakeInteraction(img, PROJ_SCREEN_SIZE_HW)
    gui = GuiControl(img, PROJ_SCREEN_SIZE_HW)

    # cv2.namedWindow(window_name, cv2.WND_PROP_FULLSCREEN)
    # cv2.moveWindow(window_name, macbook_screen_width, 0)
    # cv2.setWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN,\
    #                       cv2.WINDOW_FULLSCREEN)

    machine = Machine(dry=False)
    handle_click = make_machine_click_handler(machine)
    cv2.setMouseCallback(window_name, handle_click)
    cv2.imshow(window_name, img)

    while True:
        pressed_key = cv2.waitKey(1)

        # Close window on Escape keypress
        if pressed_key == 27:
            break

        if pressed_key == ord('b'):
            gui.add_bottom_button('translate')
            gui.add_bottom_button('spacing')

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

