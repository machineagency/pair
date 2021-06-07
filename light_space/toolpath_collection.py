import numpy as np
import cv2, os
from loader import Loader
import projection

class Toolpath:
    def __init__(self, name, filename, color='red'):
        self.name = name
        self.path = np.array([])
        self.color = color
        self.theta = 0
        self.scale = 1.0
        self.translate_x = 0
        self.translate_y = 0
        self.box_idx = None
        self.mat = np.array([[1, 0, 0], [0, 1, 0]])
        self._load_path_from_file(filename)

    def __repr__(self):
        return f'<TP {self.name} - r:{self.theta}, s:{self.scale}, tx:{self.translate_x}, ty:{self.translate_y}>'

    def _load_path_from_file(self, filepath):
        codec = filepath.split('.')[1]
        if codec == 'svg':
            self.path = Loader.load_svg(filepath)
        else:
            self.path = Loader.extract_contours_from_img_file(filepath)

class ToolpathCollection:
    def __init__(self):
        self.BITMAP_HW_PX = (720, 200)
        self.GUTTER_PX = 25
        self.directory_vectors = 'images/vectors/'
        self.directory_rasters = 'images/rasters/'
        self.bitmap = np.zeros(self.BITMAP_HW_PX + (3,))
        self.toolpaths = []
        self.__load_toolpaths_from_directory()

    def __getitem__(self, key):
        for tp in self.toolpaths:
            if tp.name == key:
                return tp
        raise KeyError(f'No toolpath with name {key}')

    def __iter__(self):
        return (tp for tp in self.toolpaths)

    @property
    def width(self):
        return self.BITMAP_HW_PX[1]

    def process_click_at_pt(self, pt, ixn):
        """
        Assumes that there is one box per "row" so that we just need to check
        the y coordinate of the click.
        """
        y_click = pt[1]
        box_idx = y_click // (self.BITMAP_HW_PX[1] + self.GUTTER_PX)
        print(self.toolpaths[box_idx])

    def __load_toolpath_to_canvas(self, filename, canvas_img):
        # TODO
        pass

    def __load_toolpaths_from_directory(self):
        for idx, filename in enumerate(os.listdir(self.directory_vectors)):
            short_name = filename.split('.')[0]
            new_tp = Toolpath(short_name, self.directory_vectors + filename)
            new_tp.box_idx = idx
            self.toolpaths.append(new_tp)

    def render_vectors(self):
        box_width = self.BITMAP_HW_PX[1]
        box_height = round(box_width * 0.75)
        overlay = np.zeros(self.bitmap.shape)
        for tp in self.toolpaths:
            y_offset = tp.box_idx * (box_height + self.GUTTER_PX)
            overlay = overlay + projection.rectangle_at( \
                    (0, y_offset), \
                    box_width, box_height, self.bitmap, 'red')
            projection.text_at(tp.name, (0, y_offset + box_height \
                    - self.GUTTER_PX), 'red', overlay)
            trans_mat = np.array([[1, 0, 0], [0, 1, y_offset]])
            trans_paths = [cv2.transform(subpath, trans_mat)\
                    for subpath in tp.path]
            cv2.polylines(overlay, trans_paths, False, (0, 0, 255), 1)
        self.bitmap = self.bitmap + overlay

    def add_bitmap_to_projection(self, proj):
        self.render_vectors()
        pad_rows = proj.shape[0] - self.bitmap.shape[0]
        pad_cols = proj.shape[1] - self.bitmap.shape[1]
        padded_bitmap = np.pad(self.bitmap, \
                ((pad_rows, 0), (pad_cols, 0), (0, 0)), \
                mode='constant')
        return proj + padded_bitmap

