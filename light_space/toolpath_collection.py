import numpy as np
from loader import Loader
import projection

class ToolpathCollection:
    def __init__(self):
        self.BITMAP_HW_PX = (720, 200)
        self.directory_vectors = 'images/vectors/'
        self.directory_rasters = 'images/rasters/'
        self.bitmap = np.zeros(self.BITMAP_HW_PX + (3,))

    def render_vectors(self):
        gutter_px = 25
        box_width = self.BITMAP_HW_PX[1]
        box_height = round(box_width * 0.75)
        box_overlay = np.zeros(self.bitmap.shape)
        for i in range(3):
            box_overlay = box_overlay + projection.rectangle_at( \
                    (0, i * (box_height + gutter_px)), \
                    box_width, box_height, self.bitmap)
        self.bitmap = self.bitmap + box_overlay

    def add_bitmap_to_projection(self, proj):
        self.render_vectors()
        pad_rows = proj.shape[0] - self.bitmap.shape[0]
        pad_cols = proj.shape[1] - self.bitmap.shape[1]
        padded_bitmap = np.pad(self.bitmap, \
                ((pad_rows, 0), (pad_cols, 0), (0, 0)), \
                mode='constant')
        return proj + padded_bitmap

