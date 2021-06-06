import numpy as np
import cv2, os
from loader import Loader
import projection

class ToolpathCollection:
    def __init__(self):
        self.BITMAP_HW_PX = (720, 200)
        self.GUTTER_PX = 25
        self._loader = Loader()
        self.directory_vectors = 'images/vectors/'
        self.directory_rasters = 'images/rasters/'
        self.bitmap = np.zeros(self.BITMAP_HW_PX + (3,))
        self.toolpaths = []
        self.__load_toolpaths_from_directory()

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
            new_tp = {}
            new_tp['path'] = Loader.load_svg(self.directory_vectors \
                                + filename)
            new_tp['idx'] = idx
            new_tp['name'] = filename.split('.')[0]
            self.toolpaths.append(new_tp)

    def render_vectors(self):
        box_width = self.BITMAP_HW_PX[1]
        box_height = round(box_width * 0.75)
        overlay = np.zeros(self.bitmap.shape)
        for tp in self.toolpaths:
            y_offset = tp['idx'] * (box_height + self.GUTTER_PX)
            overlay = overlay + projection.rectangle_at( \
                    (0, y_offset), \
                    box_width, box_height, self.bitmap, 'red')
            projection.text_at(tp['name'], (0, y_offset + box_height \
                    - self.GUTTER_PX), 'red', overlay)
            trans_mat = np.array([[1, 0, 0], [0, 1, y_offset]])
            trans_paths = [cv2.transform(subpath, trans_mat)\
                    for subpath in tp['path']]
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

