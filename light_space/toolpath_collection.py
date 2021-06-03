import numpy as np
import cv2, os
from loader import Loader
import projection

class ToolpathCollection:
    def __init__(self):
        self.BITMAP_HW_PX = (720, 200)
        self._loader = Loader()
        self.directory_vectors = 'images/vectors/'
        self.directory_rasters = 'images/rasters/'
        self.bitmap = np.zeros(self.BITMAP_HW_PX + (3,))

    @property
    def width(self):
        return self.BITMAP_HW_PX[1]

    def process_click_at_pt(self, pt):
        # TODO: load the toolpath that was clicked on
        print('NYI')

    def render_vectors(self):
        gutter_px = 25
        box_width = self.BITMAP_HW_PX[1]
        box_height = round(box_width * 0.75)
        overlay = np.zeros(self.bitmap.shape)
        for i, filename in enumerate(os.listdir(self.directory_vectors)):
            y_offset = i * (box_height + gutter_px)
            overlay = overlay + projection.rectangle_at( \
                    (0, y_offset), \
                    box_width, box_height, self.bitmap)
            paths = self._loader.load_svg(self.directory_vectors + filename)
            trans_mat = np.array([[1, 0, 0], [0, 1, y_offset]])
            trans_paths = [cv2.transform(p, trans_mat) for p in paths]
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

