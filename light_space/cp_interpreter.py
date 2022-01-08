import cv2, cmd
from PIL import Image
import numpy as np
from pyaxidraw import axidraw
from machine import Machine
import sys
import pickle

class Camera:
    def __init__(self, dry=False):
        self.dry_mode = dry
        self.PROJ_SCREEN_SIZE_HW = (900, 1440)
        self.CM_TO_PX = 37.7952755906
        self.MIN_CONTOUR_LEN = 100
        self.static_image_path = './client/img/seattle-times.jpg'
        self.camera_image_path = './volatile/camera-photo.jpg'
        self.contours = []
        self.work_env_contour = None
        self.preview_open = False
        self.fiducial_homography = np.zeros((3, 3))
        self.most_recent_img = np.zeros(0);
        if not self.dry_mode:
            self.video_capture = self.find_video_capture()

    def find_video_capture(self):
        for i in range(3):
            maybe_capture = cv2.VideoCapture(i)
            if maybe_capture.isOpened():
                return maybe_capture
        print('Could not find working camera for video capture.')

    def load_fiducial_homography_from_file(self):
        try:
            f = open('./volatile/homography.pckl', 'rb')
            homog_with_dims = pickle.load(f)
            homog = homog_with_dims[0]
        except (IOError, OSError) as e:
            print('Error trying to initialize fiducial homography for camera');
            print(e)
            f.close()
            homog = np.zeros()
        finally:
            f.close()
            return homog

    def set_homography(self, h):
        # TODO
        pass

    def _process_image(self, img):
        img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        img = cv2.GaussianBlur(img, (11, 11), 1, 1)
        # _, img = cv2.threshold(img, 150, 255, cv2.THRESH_BINARY)
        img = cv2.Canny(img, 50, 80)
        return img

    def _load_file_image(self):
        return cv2.imread(self.static_image_path)

    def _read_video_image(self):
        ret, frame = self.video_capture.read()
        proj_h = self.PROJ_SCREEN_SIZE_HW[0]
        proj_w = self.PROJ_SCREEN_SIZE_HW[1]
        if self.fiducial_homography.any():
        # if False:
            frame = cv2.warpPerspective(frame, self.fiducial_homography, \
                    (proj_w, proj_h))
        return frame

    def capture_video_frame(self):
        if self.dry_mode:
            return self._load_file_image()
        return self._read_video_image()

    def open_static_image_preview(self):
        self.preview_open = True
        self.static_image = self._load_file_image()
        cv2.imshow('preview', self.static_image)

    def open_video_preview(self):
        self.preview_open = True
        cv2.imshow('preview', self._read_video_image())

    def update_video_preview(self):
        img = self._read_video_image()
        img_edge = self._process_image(img)
        # contours = calc_contours(img_edge)
        # try:
        #     work_env_contour = find_work_env_in_contours(contours)
        #     cv2.drawContours(img, [work_env_contour], -1, (0, 255, 0), 3)
        # except ValueError:
        #     pass
        cv2.imshow('preview', img)

    def close_video_preview(self):
        self.preview_open = False
        cv2.destroyWindow('preview')

    def calc_candidate_contours(self, envelope_hw):
        # img = self._read_video_image()
        img = self._load_file_image()
        img = self._process_image(img)
        contours = calc_contours(img)
        work_env_contour = find_work_env_in_contours(contours)
        envelope_hw_px = (round(envelope_hw[0] * self.CM_TO_PX),\
                          round(envelope_hw[1] * self.CM_TO_PX))
        # TODO: this works with img_orig but we shouldn't be using it
        work_env_homog = calc_work_env_homog(self.static_image, work_env_contour,\
                                             envelope_hw_px)
        decimated_contours = decimate_contours(contours)
        # Not sure whether/how closed=T/F matters here
        min_length_lambda = lambda c: cv2.arcLength(c, closed=True)\
                            > self.MIN_CONTOUR_LEN
        culled_contours = list(filter(min_length_lambda, decimated_contours))
        trans_contours = list(map(lambda c: transform_contour_with_h(c,\
                                work_env_homog), culled_contours))
        self.contours = trans_contours
        self.work_env_contour = work_env_contour

    @property
    def candidate_contours(self):
        return self.contours

    def detect_face_boxes(self, display_on_preview=False):
        """
        Returns bounding boxes as 4-tuples of the form (x, y, width, height).
        """
        face_cascade = cv2.CascadeClassifier('haarcascade_frontalface_default.xml')
        # TODO: generalize choice of image
        img = cv2.imread(self.camera_image_path)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        if display_on_preview:
            self.draw_face_boxes_on_preview(faces)
        return faces

    def draw_face_boxes_on_preview(self, faces):
        if not self.preview_open:
            self.open_static_image_preview()
        image_with_boxes = self.static_image.copy()
        for (x, y, w, h) in faces:
            cv2.rectangle(image_with_boxes, (x, y), (x + w, y + h), \
                         (255, 0, 0), 2)
        cv2.imshow('preview', image_with_boxes)
        cv2.waitKey()

class Interpreter(cmd.Cmd):
    def __init__(self, use_prompt=False):
        cmd.Cmd.__init__(self)
        self.PROJ_SCREEN_SIZE_HW = (720, 1280)
        self.PROJ_NAME = 'projection'
        cv2.namedWindow(self.PROJ_NAME, cv2.WND_PROP_FULLSCREEN)

        Interpreter.intro = "Welcome to the interpreter."
        if use_prompt:
            Interpreter.prompt = "> "
        else:
            Interpreter.prompt = ""

        self.camera = Camera(dry=True)
        self.machine = Machine(dry=True)

    def do_image(self, arg):
        if self.camera.dry_mode:
            self.camera.open_static_image_preview()
        else:
            if self.camera.preview_open:
                self.camera.update_video_preview()
            else:
                self.camera.open_video_preview()
        while True:
            maybe_key = cv2.waitKey(100)
            if maybe_key == ord('q'):
                self.camera.close_video_preview()
                cv2.waitKey(1)
                break

    def do_detect_face_boxes(self, arg):
        def marshal_boxes_into_one_line(boxes):
            string_arrays = [np.array2string(box, separator=', ') for box in boxes]
            return '[' + ', '.join(string_arrays) + ']'

        show_on_preview = arg == 'True'
        boxes = self.camera.detect_face_boxes(show_on_preview)
        marshaled_boxes = marshal_boxes_into_one_line(boxes)
        print(marshaled_boxes)

    def do_choose_point(self, arg):
        # TODO: determine x and y scaling factors based on the ratio
        # of the work envelope to the projection window
        COORD_SCALE = 3.77952755906
        click_xy = None
        def proj_handle_click(event, x, y, flags, param):
            if event == cv2.EVENT_LBUTTONDOWN:
                nonlocal click_xy
                click_xy = (x, y)

        choose_point_proj = np.zeros(self.PROJ_SCREEN_SIZE_HW)
        cv2.namedWindow(self.PROJ_NAME, cv2.WND_PROP_FULLSCREEN)
        cv2.imshow(self.PROJ_NAME, choose_point_proj)
        cv2.setMouseCallback(self.PROJ_NAME, proj_handle_click)
        while True:
            cv2.waitKey(100)
            if click_xy:
                cv2.setMouseCallback(self.PROJ_NAME, lambda *args : None)
                cv2.destroyWindow(self.PROJ_NAME)
                cv2.waitKey(1)
                scaled_x = click_xy[0] / COORD_SCALE
                scaled_y = click_xy[1] / COORD_SCALE
                print(f'{scaled_x},{scaled_y}')
                break

    def do_draw_envelope(self, arg):
        # TODO: un-hardcode
        CM_TO_PX = 37.795275591;
        pt = (3 / CM_TO_PX, 3 / CM_TO_PX)
        width = 28
        height = 18
        instr = self.machine.plot_rect_hw(pt, height, width)
        print(instr)

    def do_generate_preview(self, arg):
        svg_filepath = './volatile/drawing.svg'
        preview_filepath = './volatile/plot_preview.svg'
        svg_string = arg
        f_drawing = open(svg_filepath, 'w')
        f_drawing.write(svg_string)
        f_drawing.close()
        preview_string = self.machine.generate_preview_svg(svg_filepath)
        f_preview = open(preview_filepath, 'w')
        f_preview.write(preview_string)
        f_preview.close()
        print(preview_string)

    def do_generate_instructions(self, arg):
        svg_filepath = './volatile/drawing.svg'
        instructions_filepath = './volatile/plot_instructions.txt'
        svg_string = arg
        f_drawing = open(svg_filepath, 'w')
        f_drawing.write(svg_string)
        f_drawing.close()
        instruction_list = self.machine.generate_axidraw_instructions(svg_filepath)
        f_instructions = open(instructions_filepath, 'w')
        for instruction in instruction_list:
            f_instructions.write(instruction + '\n')
        f_instructions.close()
        print(instruction_list)

    def do_draw_toolpath(self, arg):
        svg_filepath = './volatile/drawing.svg'
        svg_string = arg
        f = open(svg_filepath, 'w')
        f.write(svg_string)
        f.close()
        self.machine.plot_svg(svg_filepath)

    def do_take_photo(self, arg):
        try:
            img = self.camera.capture_video_frame()
            h_flat = np.fromstring(arg, dtype='float', sep=',')
            h_shrink = h_flat.reshape((3, 3))
            h_expand = np.linalg.inv(h_shrink)
            img_height, img_width = img.shape[0], img.shape[1]
            img_adjusted = cv2.warpPerspective(img, h_expand, (img_width, img_height))
            self.camera.most_recent_img = img_adjusted
            cv2.imwrite('volatile/camera-photo.jpg', img_adjusted)
            print('Image written.')
        except Exception as e:
            print('Could not warp photo')
            print(e)

    def do_warp_last_photo(self, arg):
        if self.camera.most_recent_img.any():
            try:
                img = self.camera.most_recent_img
                h_flat = np.fromstring(arg, dtype='float', sep=',')
                h_shrink = h_flat.reshape((3, 3))
                h_expand = np.linalg.inv(h_shrink)
                img_height, img_width = img.shape[0], img.shape[1]
                img_warped = cv2.warpPerspective(img, h_expand, (img_width, img_height))
                cv2.imwrite('volatile/camera-photo-warped.jpg', img_warped)
                print('Image written.')
            except Exception as e:
                print('Could not warp photo')
                print(e)

    def do_bye(self, arg):
        print("Bye!")
        return True

    def do_EOF(self, arg):
        return True

def main():
    Interpreter().cmdloop();

if __name__ == '__main__':
    main()


