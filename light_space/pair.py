from functools import reduce
import math
import cv2
import numpy as np
from machine import Machine
from camera import Camera
import projection

class Interaction:
    def __init__(self, img, screen_size, gui):
        self.Y_OFFSET_PX = 20
        self.envelope_hw = (18, 28) # slightly smaller than axidraw envelope
        self.img = img
        self.gui = gui
        self.set_cam_color('red')
        self.set_listening_click_to_move(False)
        self.set_listening_translate(False)
        self.set_listening_rotate(False)
        self.set_listening_spacing(False)
        self.candidate_contours = []
        self.chosen_contours = []

        # Selection
        self.pt_mdown = (0, 0)
        self.pt_mdrag = (0, 0)
        self.set_drawing_sel_box(False)
        self.curr_sel_contour = None

        # Set arbitrary CAM data
        self.cam_contours = [\
            np.array([[[937, 539]], [[660, 583]], [[878, 636]]]),
            np.array([[[754, 496]], [[900, 636]], [[936, 554]]]),
        ]
        self.trans_mat = np.array([[1, 0, 0], [0, 1, 0]])
        self.theta = 0
        self.translate_x = 0
        self.translate_y = 0
        self.calib_pt = (self.translate_x, self.translate_y)
        self.render()

    def translate(self, x, y):
        centroid = self.calc_cam_centroid()
        self.translate_x = x - centroid[0]
        self.translate_y = y - centroid[1]
        self.calib_pt = (self.translate_x, self.translate_y)
        self.render()

    def rotate(self, theta):
        self.theta = theta
        self.render()

    # Getters and setters

    def set_cam_color(self, color_name):
        self.color_name = color_name

    def set_drawing_sel_box(self, flag):
        self.drawing_sel_box = flag;

    def set_listening_click_to_move(self, flag):
        self.listening_click_to_move = flag

    def set_listening_translate(self, flag):
        self.listening_translate = flag

    def set_listening_rotate(self, flag):
        self.listening_rotate = flag

    def set_listening_spacing(self, flag):
        self.listening_spacing = flag

    def set_candidate_contours(self, contours):
        self.candidate_contours = contours

    def clear_candidate_contours(self):
        self.candidate_contours = []

    def set_curr_sel_contour(self, contours):
        self.curr_sel_contour = contours

    def clear_curr_sel_contour(self):
        self.curr_sel_contour = None

    def set_chosen_contours(self, contours):
        self.chosen_contours = contours

    def clear_chosen_contours(self):
        self.chosen_contours = []

    def select_contour_at_point(self, pt):
        selected_contours = []
        eps_px = 10
        for contour in self.candidate_contours:
            signed_dist = cv2.pointPolygonTest(contour, pt, measureDist=True)
            if abs(signed_dist) <= eps_px:
                selected_contours.append(contour)
        max_len = 0
        optimal_contour = None
        for c in selected_contours:
            if cv2.arcLength(c, closed=True) >= max_len:
                optimal_contour = c
        return optimal_contour

    def calc_offset_contours(self, contours):
        if len(contours) == 0:
            return []
        translated_contours = list(map(lambda c: np.copy(c), contours))
        for c in translated_contours:
            for p in c:
                p += np.array([0, self.Y_OFFSET_PX])
        return translated_contours

    def calc_cam_centroid(self):
        centroids = []
        for c in self.cam_contours:
            moments = cv2.moments(c)
            cx = int(moments['m10'] / moments['m00'])
            cy = int(moments['m01'] / moments['m00'])
            centroids.append((cx, cy))
        def add_pts(p0, p1):
            return ((p0[0] + p1[0], p0[1] + p1[1]))
        avg_centroid = reduce(add_pts, centroids)
        avg_centroid = (avg_centroid[0] // len(centroids),\
                        avg_centroid[1] // len(centroids))
        return avg_centroid

    def calc_line_angle(self, line_tup):
        v0 = line_tup[0].reshape((2, 1))
        v1 = line_tup[1].reshape((2, 1))
        v = [v1[0] - v0[0], v1[1] - v0[1]]
        x_unit = np.array([1, 0]).reshape((1, 2))
        numer = np.dot(np.array(x_unit), np.array(v))
        denom = math.sqrt(v[0] ** 2 + v[1] ** 2)
        if denom == 0:
            print('Calculated angle on overlapping points, returning 0 deg')
            return 0
        angle_rad = math.acos(numer / denom)
        return round((angle_rad / math.pi) * 180)

    def find_longest_bbox_line(self, box_contour):
        box = box_contour.reshape(4, 2)
        dist_side_a = np.linalg.norm(box[0] - box[1])
        dist_side_b = np.linalg.norm(box[0] - box[3])
        if dist_side_a > dist_side_b:
            return (box[0], box[1])
        return (box[0], box[3])

    # TODO: get rid of this function it's bad
    def calc_bbox_lines(self, box_pts):
        try:
            box_pts = box_pts.reshape(4, 2)
        except:
            raise ValueError('Cannot calculate bbox lines for non-box contour')
        bbox_lines = {}
        bbox_lines['top'] = (box_pts[2], box_pts[3])
        bbox_lines['bottom'] = (box_pts[0], box_pts[1])
        bbox_lines['left'] = (box_pts[1], box_pts[2])
        bbox_lines['right'] = (box_pts[3], box_pts[0])
        return bbox_lines

    def combine_contours(self, contours):
        def combine(c0, c1):
            return np.append(c0, c1, axis=0)
        return reduce(combine, contours).astype(np.int32)

    def calc_min_bbox_for_contour(self, contour, add_offset=True):
        rectangle = cv2.minAreaRect(contour)
        box_pts = np.int32(cv2.boxPoints(rectangle))
        if add_offset:
            return np.array(self.calc_offset_contours([box_pts]))
        return np.array(box_pts)

    def calc_straight_bbox_for_contour(self, contour, add_offset=True):
        x, y, w, h = cv2.boundingRect(contour)
        matrix = np.array([[x, y], [x + w, y], [x + w, y + h], [x, y + h]])
        return matrix.reshape((4, 2))

    def calc_line_for_contour(self, contour, add_offset=True):
        [vx, vy, x, y] = cv2.fitLine(contour, cv2.DIST_L2, 0, 0.01, 0.01)
        return ((x[0], y[0]), (vx[0], vy[0]))

    def _render_candidate_contours(self):
        translated_contours = self.calc_offset_contours(self.candidate_contours)
        cv2.drawContours(self.img, translated_contours, -1, (255, 0, 0), 1)

    def _render_chosen_contours(self):
        if len(self.chosen_contours) > 0:
            translated_contours = self.calc_offset_contours(self.chosen_contours)
            cv2.drawContours(self.img, translated_contours, -1, (0, 255, 255), 3)
            for contour in self.chosen_contours:
                box_pts = self.calc_min_bbox_for_contour(contour)
                cv2.drawContours(self.img, [box_pts], 0, (255, 255, 0), 1)

    def _render_sel_box(self):
        if self.drawing_sel_box:
            projection.rectangle_from_to(self.pt_mdown, self.pt_mdrag, 'white', self.img)

    def _render_sel_contour(self):
        if self.curr_sel_contour is not None:
            trans_contours = self.calc_offset_contours([self.curr_sel_contour])
            cv2.drawContours(self.img, trans_contours, 0, (255, 255, 255), 3)
            box_pts = self.calc_min_bbox_for_contour(self.curr_sel_contour)
            cv2.drawContours(self.img, [box_pts], 0, (255, 255, 0), 1)

    def _render_cam_bbox(self, transformed_cam_contours):
        combined_contour = self.combine_contours(transformed_cam_contours)
        # box_pts = self.calc_straight_bbox_for_contour(combined_contour, False)
        # trans_box = cv2.transform(box_pts, self.trans_mat)
        # self.cam_bbox = trans_box
        box_pts = self.calc_min_bbox_for_contour(combined_contour, False)
        self.cam_bbox = box_pts
        cv2.drawContours(self.img, [box_pts], 0, (255, 255, 0), 1)

    def _render_bbox_lines(self, bbox_lines):
        projection.line_from_to(bbox_lines['top'][0], bbox_lines['top'][1],\
                                'white', self.img)
        projection.line_from_to(bbox_lines['bottom'][0], bbox_lines['bottom'][1],\
                                'red', self.img)
        projection.line_from_to(bbox_lines['left'][0], bbox_lines['left'][1],\
                                'cyan', self.img)
        projection.line_from_to(bbox_lines['right'][0], bbox_lines['right'][1],\
                                'yellow', self.img)

    def _render_cam(self):
        if self.color_name == 'white':
            color = (255, 255, 255)
        elif self.color_name == 'black':
            color = (0, 0, 0)
        elif self.color_name == 'red':
            color = (0, 0, 255)
        elif self.color_name == 'green':
            color = (0, 255, 0)
        else:
            color = (255, 255, 255)
        centroid = self.calc_cam_centroid()
        self.trans_mat = cv2.getRotationMatrix2D(centroid, self.theta, 1)
        self.trans_mat[0, 2] += self.translate_x
        self.trans_mat[1, 2] += self.translate_y
        trans_contours = list(map(lambda c: cv2.transform(c, self.trans_mat),\
                                  self.cam_contours))
        self.curr_trans_cam = trans_contours
        cv2.drawContours(self.img, trans_contours, -1, color, 3)
        if self.listening_translate or self.listening_rotate:
            self._render_cam_bbox()

    def render(self):
        """
        Note: this function draws each render subroutine over the last call
        to the effect of being an informal z-buffer.
        """
        self.img = np.zeros(self.img.shape, np.float32)
        self._render_candidate_contours()
        self._render_chosen_contours()
        self._render_sel_box()
        self._render_sel_contour()
        self._render_cam()
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
            'gutter' : 100\
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
        self.add_bottom_button('rotate', img)
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

        if event == cv2.EVENT_LBUTTONDOWN:
            if ixn.listening_translate:
                ixn.translate(x, y)
                ixn.set_cam_color('red')
                ixn.set_listening_translate(False)
                ixn.render()
            elif ixn.listening_rotate:
                if len(ixn.chosen_contours) > 0:
                    contour = ixn.chosen_contours[0]
                    box = ixn.calc_min_bbox_for_contour(contour)
                    line = ixn.find_longest_bbox_line(box)
                    angle = ixn.calc_line_angle(line)
                    ixn.theta = angle
                    ixn.set_cam_color('red')
                    ixn.set_listening_rotate(False)
                    ixn.render()
            elif ixn.listening_click_to_move:
                scaled_x = x / CM_TO_PX
                scaled_y = y / CM_TO_PX
                scaled_x = round(scaled_x, 2)
                scaled_y = round(scaled_y, 2)
                instr = machine.travel((scaled_x, scaled_y))
                print(instr)
            else:
                ixn.set_drawing_sel_box(True)
                ixn.pt_mdown = (x, y)

        # On mouse move, if we are drawing sel box, actually draw it
        if event == cv2.EVENT_MOUSEMOVE:
            if ixn.drawing_sel_box:
                ixn.pt_mdrag = (x, y)
                ixn.render()

        if event == cv2.EVENT_LBUTTONUP:
            if ixn.drawing_sel_box:
                ixn.pt_mdown = (0, 0)
                ixn.pt_mdrag = (0, 0)
                ixn.set_drawing_sel_box(False)
                ixn.render()

            ixn.set_curr_sel_contour(ixn.select_contour_at_point((x, y)))
            ixn.render()

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
    ixn = Interaction(img, PROJ_SCREEN_SIZE_HW, gui)

    machine = Machine(dry=True)
    camera = Camera()
    handle_click = make_machine_ixn_click_handler(machine, ixn)
    cv2.setMouseCallback(window_name, handle_click)
    cv2.imshow(window_name, ixn.img)

    try:
        while True:
            CM_TO_PX = 37.7952755906
            pressed_key = cv2.waitKey(1)

            if pressed_key == 27:
                """
                Close window on Escape keypress.
                """
                break

            if pressed_key == ord('='):
                """
                If spacing adjustment mode on, increase spacing.
                If rotation adjustment mode on, rotate CCW.
                """
                if ixn.listening_spacing:
                    ixn.spacing += 10
                if ixn.listening_rotate:
                    ixn.theta = (ixn.theta + 45) % 360
                    ixn.rotate(ixn.theta)
                ixn.render()

            if pressed_key == ord('-') and ixn.listening_spacing:
                """
                If spacing adjustment mode on, reduce spacing.
                If rotation adjustment mode on, rotate CW.
                """
                if ixn.listening_spacing:
                    ixn.spacing -= 10
                if ixn.listening_rotation:
                    ixn.theta = (ixn.theta - 45) % 360
                    ixn.rotate(ixn.theta)
                ixn.render()

            if pressed_key == ord('m'):
                """
                Toggle click-to-move mode.
                """
                ixn.set_listening_click_to_move(not ixn.listening_click_to_move)
                if ixn.listening_click_to_move:
                    ixn.set_listening_spacing(False)
                    ixn.set_listening_rotate(False)
                    ixn.set_listening_translate(False)
                    ixn.set_cam_color('red')
                ixn.render()

            if pressed_key == ord('s'):
                """
                Toggle selection spacing adjustment mode.
                """
                ixn.set_listening_spacing(not ixn.listening_spacing)
                if ixn.listening_spacing:
                    ixn.set_listening_translate(False)
                    ixn.set_listening_click_to_move(False)
                    ixn.set_listening_rotate(False)
                    ixn.set_cam_color('green')
                else:
                    ixn.set_cam_color('red')
                ixn.render()

            if pressed_key == ord('t'):
                """
                Toggle selection translation mode.
                """
                ixn.set_listening_translate(not ixn.listening_translate)
                if ixn.listening_translate:
                    ixn.set_listening_click_to_move(False)
                    ixn.set_listening_spacing(False)
                    ixn.set_listening_rotate(False)
                    ixn.set_cam_color('green')
                ixn.render()

            if pressed_key == ord('r'):
                ixn.set_listening_rotate(not ixn.listening_rotate)
                if ixn.listening_rotate:
                    ixn.set_listening_click_to_move(False)
                    ixn.set_listening_spacing(False)
                    ixn.set_listening_translate(False)
                    ixn.set_cam_color('green')
                else:
                    ixn.set_cam_color('red')
                ixn.render()

            if pressed_key == ord('q'):
                """
                Calibration square.
                """
                pt = (ixn.calib_pt[0] / CM_TO_PX, ixn.calib_pt[1] / CM_TO_PX)
                instr = machine.plot_rect_hw(pt, 2, 2)
                print(instr)

            if pressed_key == ord('e'):
                """
                Machine draws work envelope.
                """
                pt = (0, ixn.Y_OFFSET_PX / CM_TO_PX)
                instr = machine.plot_rect_hw(pt, ixn.envelope_hw[0],\
                                             ixn.envelope_hw[1])
                print(instr)

            if pressed_key == ord('0') or pressed_key == ord('1')\
                or pressed_key == ord('2'):
                """
                Draw line number 0, 1, or 2.
                """
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

            if pressed_key == ord('d'):
                for c in ixn.curr_trans_cam:
                    for p in c:
                        pt_tup = (p[0, 0] / CM_TO_PX, p[0, 1] / CM_TO_PX)
                        machine.travel(pt_tup)

            if pressed_key == ord('c'):
                """
                Show candidate contours from camera feed.
                Clear existing chosen and candidate contours.
                """
                ixn.clear_chosen_contours()
                ixn.clear_candidate_contours()
                ixn.clear_curr_sel_contour()
                camera.calc_candidate_contours(ixn.envelope_hw)
                ixn.set_candidate_contours(camera.candidate_contours)
                ixn.render()

            if pressed_key == 13:
                """
                Move candidate contours to chosen contours on ENTER.
                """
                if ixn.curr_sel_contour is not None:
                    ixn.set_chosen_contours(list(map(lambda c: np.copy(c),\
                                                   [ixn.curr_sel_contour])))
                ixn.clear_candidate_contours()
                ixn.clear_curr_sel_contour()
                ixn.render()

    finally:
        cv2.destroyAllWindows()
        machine.return_to_origin()
        machine.disconnect()

def main():
    run_canvas_loop()

if __name__ == '__main__':
    main()

