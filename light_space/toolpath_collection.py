import numpy as np
from loader import Loader
import projection

class ToolpathCollection:
    def __init__(self):
        self.BITMAP_HW_PX = (720, 100)
        self.directory_vectors = 'images/vectors/'
        self.directory_rasters = 'images/rasters/'
        self.bitmap = np.zeros(self.BITMAP_HW_PX + (3,))

    def render_vectors(self):
        gutter_px = 20
        box_height = 75
        box_width = 100
        for i in range(3):
            projection.rectangle_at((0, i * (box_height + gutter_px)), \
                                     box_height, box_width, self.bitmap)

    def add_bitmap_to_projection(self, proj):
        self.render_vectors()
        return proj + self.bitmap
