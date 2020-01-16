import cv2
import numpy as np
from machine import Machine
import projection

class FakeInteraction:
    def __init__(self, img, screen_size, gui):
        self.m = Machine(dry=False)
        self.envelope_hw = (18, 28) # slightly smaller than axidraw envelope
        self.img = img
        self.gui = gui
        self.set_cam_color('red')
        self.set_listening_translate(False)
        self.set_listening_spacing(False)

        # Set arbitrary CAM data
        self.length = screen_size[1] // 2
        self.spacing = screen_size[0] // 5
        self.translate_x = screen_size[1] // 4
        self.translate_y = screen_size[0] // 4
        self.calib_pt = (self.translate_x, self.translate_y)
        self.render()

    def translate(self, x, y):
        self.translate_x = x
        self.translate_y = y
        self.calib_pt = (self.translate_x, self.translate_y)
        self.render()

    def set_cam_color(self, color_name):
        self.color_name = color_name

    def set_listening_translate(self, flag):
        self.listening_translate = flag

    def set_listening_spacing(self, flag):
        self.listening_spacing = flag

    def render(self):
        self.img = np.zeros(self.img.shape, np.float32)
        for i in range(0, 3):
            start_pt = (self.translate_x, i * self.spacing + self.translate_y)
            end_pt = (self.length + self.translate_x, i * self.spacing + self.translate_y)
            projection.line_from_to(start_pt, end_pt, self.color_name, self.img)
        self.gui.render_gui(self.img)
        cv2.imshow('Projection', self.img)

class GuiControl:
    def __init__(self, screen_size):
        self.bottom_buttons = []
        self.CM_TO_PX = 37.7952755906
        self.Y_OFFSET = 20
        self.envelope_hw = (18, 28) # slightly smaller than axidraw envelope

        self.button_params = {\
            'start_pt' : (screen_size[1] // 10, screen_size[0] - screen_size[0] // 8),\
            'gutter' : 75\
        }

    def add_bottom_button(self, text, img):
        text_size = projection.find_text_size(text)
        x_offset = len(self.bottom_buttons) *\
                   (text_size[0] + self.button_params['gutter'])
        pt = (self.button_params['start_pt'][0] + x_offset,\
              self.button_params['start_pt'][1])
        rect_obj = projection.rectangle_at(pt, text_size[0], text_size[1], img)
        text_obj = projection.text_at(text, pt, 'black', img)
        self.bottom_buttons.append((rect_obj, text_obj))

    def calibration_square(self, start_pt, length, img):
        length *= self.CM_TO_PX
        pt1 = (start_pt[0] + length, start_pt[1])
        pt2 = (start_pt[0] + length, start_pt[1] + length)
        pt3 = (start_pt[0], start_pt[1] + length)
        projection.line_from_to(start_pt, pt1, 'white', img)
        projection.line_from_to(pt1, pt2, 'white', img)
        projection.line_from_to(pt2, pt3, 'white', img)
        projection.line_from_to(pt3, start_pt, 'white', img)

    def calibration_envelope(self, envelope_hw, img):
        height_px = envelope_hw[0] * self.CM_TO_PX
        width_px = envelope_hw[1] * self.CM_TO_PX
        thickness = 3
        pt0 = (thickness, thickness + self.Y_OFFSET)
        pt1 = (width_px - thickness, thickness + self.Y_OFFSET)
        pt2 = (width_px - thickness, height_px - thickness + self.Y_OFFSET)
        pt3 = (thickness, height_px - thickness + self.Y_OFFSET)
        projection.line_from_to(pt0, pt1, 'red', img)
        projection.line_from_to(pt1, pt2, 'red', img)
        projection.line_from_to(pt2, pt3, 'red', img)
        projection.line_from_to(pt3, pt0, 'red', img)

    def render_gui(self, img):
        # TODO: don't recreate buttons, just separate rendering vs data
        self.bottom_buttons = []
        self.add_bottom_button('translate', img)
        self.add_bottom_button('spacing', img)
        self.calibration_envelope(self.envelope_hw, img)

def make_machine_ixn_click_handler(machine, ixn):
    def handle_click(event, x, y, flags, param):
        def invert_y(y):
            """
            Use if plotter is facing same side as projection
            """
            return GRID_IMG_SIZE[1] - y;

        # TODO: way of sharing image dimensions
        CM_TO_PX = 37.7952755906

        if ixn.listening_translate:
            if event == cv2.EVENT_LBUTTONDOWN:
                ixn.translate(x, y)
                ixn.set_cam_color('red')
                ixn.set_listening_translate(False)
                ixn.render()
        else:
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
    gui = GuiControl(PROJ_SCREEN_SIZE_HW)
    ixn = FakeInteraction(img, PROJ_SCREEN_SIZE_HW, gui)

    machine = Machine(dry=False)
    handle_click = make_machine_ixn_click_handler(machine, ixn)
    cv2.setMouseCallback(window_name, handle_click)
    cv2.imshow(window_name, ixn.img)

    try:
        while True:
            CM_TO_PX = 37.7952755906
            Y_OFFSET_PX = 20
            pressed_key = cv2.waitKey(1)

            # Close window on Escape keypress
            if pressed_key == 27:
                break

            if pressed_key == ord('=') and ixn.listening_spacing:
                ixn.spacing += 10
                ixn.render()

            if pressed_key == ord('-') and ixn.listening_spacing:
                ixn.spacing -= 10
                ixn.render()

            if pressed_key == ord('s'):
                ixn.set_listening_spacing(not ixn.listening_spacing)
                if ixn.listening_spacing:
                    ixn.set_listening_translate(False)
                    ixn.set_cam_color('green')
                else:
                    ixn.set_cam_color('red')
                ixn.render()

            if pressed_key == ord('t'):
                ixn.set_listening_spacing(False)
                ixn.set_listening_translate(True)
                ixn.set_cam_color('green')
                ixn.render()

            if pressed_key == ord('q'):
                pt = (ixn.calib_pt[0] / CM_TO_PX, ixn.calib_pt[1] / CM_TO_PX)
                instr = machine.plot_rect_hw(pt, 2, 2)
                print(instr)

            if pressed_key == ord('e'):
                pt = (0, Y_OFFSET_PX / CM_TO_PX)
                instr = machine.plot_rect_hw(pt, ixn.envelope_hw[0],\
                                             ixn.envelope_hw[1])
                print(instr)

            if pressed_key == ord('0') or pressed_key == ord('1')\
                or pressed_key == ord('2'):
                # Exit any edit mode first
                ixn.set_listening_translate(False)
                ixn.set_listening_spacing(False)
                ixn.set_cam_color('red')
                ixn.render()

                # Calculate and draw lines
                i = int(chr(pressed_key))
                start_pt = (ixn.translate_x / CM_TO_PX,\
                            (i * ixn.spacing + ixn.translate_y) / CM_TO_PX)
                end_pt = ((ixn.length + ixn.translate_x) / CM_TO_PX,\
                          (i * ixn.spacing + ixn.translate_y) / CM_TO_PX)
                machine.travel(start_pt)
                machine.line(end_pt)
                machine.pen_up()

    finally:
        cv2.destroyAllWindows()
        machine.return_to_origin()
        machine.disconnect()

def main():
    run_canvas_loop()

if __name__ == '__main__':
    main()

