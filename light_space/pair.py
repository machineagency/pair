import cv2
import numpy as np
from machine import Machine
import projection

class FakeInteraction:
    def __init__(self, img, screen_size, gui_control):
        self.m = Machine(dry=False)
        self.envelope_hw = (18, 28) # slightly smaller than axidraw envelope
        self.img = img
        self.gui_control = gui_control
        self.length = screen_size[1] // 2
        self.spacing = screen_size[0] // 5
        self.translate_x = screen_size[1] // 4
        self.translate_y = screen_size[0] // 4
        for i in range(0, 3):
            start_pt = (self.translate_x, i * self.spacing + self.translate_y)
            end_pt = (self.length + self.translate_x, i * self.spacing + self.translate_y)
            projection.line_from_to(start_pt, end_pt, self.img)
        self.calib_pt = (self.translate_x, self.translate_y)
        gui_control.calibration_square(self.calib_pt, 2)
        gui_control.calibration_envelope(self.envelope_hw)

class GuiControl:
    def __init__(self, img, screen_size):
        self.img = img
        self.bottom_buttons = []
        self.CM_TO_PX = 37.7952755906
        self.Y_OFFSET = 20

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

    def calibration_square(self, start_pt, length):
        length *= self.CM_TO_PX
        pt1 = (start_pt[0] + length, start_pt[1])
        pt2 = (start_pt[0] + length, start_pt[1] + length)
        pt3 = (start_pt[0], start_pt[1] + length)
        projection.line_from_to(start_pt, pt1, self.img)
        projection.line_from_to(pt1, pt2, self.img)
        projection.line_from_to(pt2, pt3, self.img)
        projection.line_from_to(pt3, start_pt, self.img)

    def calibration_envelope(self, envelope_hw):
        height_px = envelope_hw[0] * self.CM_TO_PX
        width_px = envelope_hw[1] * self.CM_TO_PX
        thickness = 3
        pt0 = (thickness, thickness + self.Y_OFFSET)
        pt1 = (width_px - thickness, thickness + self.Y_OFFSET)
        pt2 = (width_px - thickness, height_px - thickness + self.Y_OFFSET)
        pt3 = (thickness, height_px - thickness + self.Y_OFFSET)
        projection.line_from_to(pt0, pt1, self.img)
        projection.line_from_to(pt1, pt2, self.img)
        projection.line_from_to(pt2, pt3, self.img)
        projection.line_from_to(pt3, pt0, self.img)

def make_machine_click_handler(machine):
    def handle_click(event, x, y, flags, param):
        def invert_y(y):
            """
            Use if plotter is facing same side as projection
            """
            return GRID_IMG_SIZE[1] - y;

        # TODO: way of sharing image dimensions
        CM_TO_PX = 37.7952755906

        if event == cv2.EVENT_LBUTTONDOWN:
            scaled_x = x / CM_TO_PX
            scaled_y = y / CM_TO_PX
            scaled_x = round(scaled_x, 2)
            scaled_y = round(scaled_y, 2)
            instr = machine.travel((scaled_x, scaled_y))
            print(instr)

    return handle_click

def run_canvas_loop():
    MAC_SCREEN_SIZE_HW = (900, 1440)
    PROJ_SCREEN_SIZE_HW = (720, 1280)
    SCREEN_W_EPS = 5
    img_size_three_channel = PROJ_SCREEN_SIZE_HW + (3,)
    img = np.zeros(img_size_three_channel, np.float32)
    window_name = 'Projection'
    cv2.namedWindow(window_name, cv2.WND_PROP_FULLSCREEN)
    cv2.moveWindow(window_name, MAC_SCREEN_SIZE_HW[1], 0)
    cv2.setWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
    gui = GuiControl(img, PROJ_SCREEN_SIZE_HW)
    ixn = FakeInteraction(img, PROJ_SCREEN_SIZE_HW, gui)

    machine = Machine(dry=False)
    handle_click = make_machine_click_handler(machine)
    cv2.setMouseCallback(window_name, handle_click)
    cv2.imshow(window_name, img)

    try:
        while True:
            CM_TO_PX = 37.7952755906
            Y_OFFSET_PX = 20
            pressed_key = cv2.waitKey(1)

            # Close window on Escape keypress
            if pressed_key == 27:
                break

            if pressed_key == ord('b'):
                gui.add_bottom_button('translate')
                gui.add_bottom_button('spacing')

            if pressed_key == ord('s'):
                pt = (ixn.calib_pt[0] / CM_TO_PX, ixn.calib_pt[1] / CM_TO_PX)
                instr = machine.plot_rect_hw(pt, 2, 2)
                print(instr)

            if pressed_key == ord('e'):
                pt = (0, Y_OFFSET_PX)
                instr = machine.plot_rect_hw(pt, ixn.envelope_hw[0],\
                                             ixn.envelope_hw[1])
                print(instr)

            cv2.imshow("Projection", img)
    finally:
        cv2.destroyAllWindows()
        machine.return_to_origin()
        machine.disconnect()

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

