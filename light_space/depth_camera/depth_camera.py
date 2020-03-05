import pyrealsense2 as rs
import numpy as np
import cv2

class DepthCamera():
    def __init__(self):
        self.pipeline = self.init_pipeline()

    def init_pipeline(self):
        pass

    def test(self):
        print('testing')

if __name__ == '__main__':
    dc = DepthCamera()
    dc.test()
