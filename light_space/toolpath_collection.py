import numpy as np
import cv2, os
from functools import reduce
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
        return (f'<TP {self.name} - r:{self.theta}, s:{self.scale}, '
                f'tx:{self.translate_x}, ty:{self.translate_y}, '
                f'idx:{self.box_idx}>')

    def _load_path_from_file(self, filepath):
        codec = filepath.split('.')[1]
        if codec == 'svg':
            self.path = Loader.load_svg(filepath)
        else:
            self.path = Loader.extract_contours_from_img_file(filepath)

    def as_combined_subpaths(self):
        def combine(c0, c1):
            return np.append(c0, c1, axis=0)
        return reduce(combine, self.path.copy()).astype(np.int32)

class ToolpathCollection:
    def __init__(self):
        self.BITMAP_HW_PX = (800, 100)
        self.GUTTER_PX = 25
        self.directory_vectors = 'images/'
        self.bitmap = np.zeros(self.BITMAP_HW_PX + (3,))
        self.toolpaths = []
        self.active_toolpaths = []
        self.__load_toolpaths_from_directory()

    def __getitem__(self, key):
        for tp in self.active_toolpaths:
            if tp.name == key:
                return tp
        raise KeyError(f'No toolpath with name {key}')

    def __iter__(self):
        return iter(self.active_toolpaths)

    @property
    def width(self):
        return self.BITMAP_HW_PX[1]

    @property
    def box_width(self):
        return self.width

    @property
    def box_height(self):
        return round(self.box_width * 0.75)

    def process_click_at_pt(self, pt, ixn):
        """
        Assumes that there is one box per "row" so that we just need to check
        the y coordinate of the click.
        """
        try:
            y_click = pt[1]
            box_idx = y_click // (self.box_height + self.GUTTER_PX)
            tp_to_add = self.toolpaths[box_idx]
            # Check to make sure we don't have a toolpath of the same name
            # already active. In the future, perhaps if this is the case,
            # then we just select that toolpath on the canvas.
            for tp in self.active_toolpaths:
                if tp.name == tp_to_add.name:
                    return
            self.active_toolpaths.append(tp_to_add)
        except IndexError:
            pass

    def __load_toolpaths_from_directory(self):
        def fn_not_hidden_or_idr(filename):
            return filename[0] != '.' and filename.find('.') != -1
        filenames = os.listdir(self.directory_vectors)
        filenames = list(filter(fn_not_hidden_or_idr, filenames))
        for idx, filename in enumerate(filenames):
            short_name, codec = filename.lower().split('.')
            if codec == 'svg' or codec == 'png' or codec == 'jpg':
                new_tp = Toolpath(short_name, self.directory_vectors + filename)
                new_tp.box_idx = idx
                self.toolpaths.append(new_tp)

    def render_vectors(self):
        overlay = np.zeros(self.bitmap.shape)
        for tp in self.toolpaths:
            y_offset = tp.box_idx * (self.box_height + self.GUTTER_PX)
            overlay = overlay + projection.rectangle_at( \
                    (0, y_offset), \
                    self.box_width, self.box_height, self.bitmap, 'red')
            projection.text_at(tp.name, (0, y_offset + self.box_height \
                    - self.GUTTER_PX), 'red', overlay)
            _, _, path_bbox_w, path_bbox_h = cv2.boundingRect(tp \
                                                .as_combined_subpaths())
            downscale_x = self.box_width / path_bbox_w
            downscale_y = self.box_height / path_bbox_h
            ds_min = min(downscale_x, downscale_y)
            trans_mat = np.array([[ds_min, 0, 0], \
                                  [0, ds_min, y_offset]])
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

