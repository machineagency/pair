import numpy as np
import svgpathtools as pt
import math
import cv2
from functools import reduce

class Loader:
    def __init__(self):
        pass

    @staticmethod
    def load_svg(filepath):
        paths, attrs = pt.svg2paths(filepath)
        contours = []
        T_SAMP = 10
        for idx, path in enumerate(paths):
            subpath_matrices = []
            try:
                translate_attr = attrs[idx]['transform']
                translate_num = Loader._parse_translate_attr(translate_attr)
                path_trans = path.translated(translate_num)
            except KeyError:
                path_trans = path
            for subpath in path_trans:
                if type(subpath) == pt.CubicBezier or type(subpath) == pt.Arc:
                    sp_mtx = np.zeros((T_SAMP + 1, 1, 2))
                    for step in range(0, T_SAMP + 1):
                        t = step / T_SAMP
                        point = subpath.point(t)
                        x = point.real
                        y = point.imag
                        sp_mtx[step, 0 , 0] = round(x)
                        sp_mtx[step, 0 , 1] = round(y)

                if type(subpath) == pt.Line:
                    sp_mtx = np.zeros((2, 1, 2))
                    sp_mtx[0, 0, 0] = round(subpath.start.real)
                    sp_mtx[0, 0, 1] = round(subpath.start.imag)
                    sp_mtx[1, 0, 0] = round(subpath.end.real)
                    sp_mtx[1, 0, 1] = round(subpath.end.imag)

                subpath_matrices.append(sp_mtx)
            contours.append(Loader._combine_subpath_matrices(subpath_matrices))
        return contours

    @staticmethod
    def extract_contours_from_img_file(img_filepath):
        img = cv2.imread(img_filepath)
        _, edge_img = cv2.threshold(img, 100, 255, cv2.THRESH_BINARY)
        edge_img = cv2.cvtColor(edge_img, cv2.COLOR_BGR2GRAY)
        _, contours, hierarchy = cv2.findContours(edge_img, cv2.RETR_TREE,\
                                               cv2.CHAIN_APPROX_SIMPLE)
        return contours
        # img = cv2.imread(img_filepath)
        # _ = np.zeros(img.shape)
        # thresh_low = 50
        # thresh_high = 100
        # edge_img = cv2.Canny(img, thresh_low, thresh_high)
        # return [edge_img]

    @staticmethod
    def export_contours_as_svg(contours, title):
        culled_contours = self._cull_small_contours(contours)
        CM_TO_PX = 37.7952755906
        fp = open(f'output_vectors/{title}.svg', mode='w+')
        fp.write(f'<svg id="{title}" data-name="{title}" width="25cm" height="25cm" xmlns="http://www.w3.org/2000/svg">\n')
        fp.write('<defs>\n')
        fp.write('\t<style>\n')
        fp.write('\t\t.class {\n')
        fp.write('\t\t\tfill: none;\n')
        fp.write('\t\t\tstroke: #000;\n')
        fp.write('\t\t\tstroke-miterlimit: 10;\n')
        fp.write('\t\t\tstroke-width: 0.25px;\n')
        fp.write('\t\t}\n')
        fp.write('\t</style>\n')
        fp.write('</defs>\n')
        fp.write(f'<title>{title}</title>\n')
        for contour in culled_contours:
            init_pt_tup = (contour[0][0, 0], contour[0][0, 1])
            fp.write(f'<path d="M{"%.4f"%(init_pt_tup[0])},{"%.4f"%(init_pt_tup[1])}')
            for point in contour[1:]:
                pt_tup = (point[0, 0], point[0, 1])
                fp.write(f'L{"%.4f"%(pt_tup[0])},{"%.4f"%(pt_tup[1])}')
            fp.write('Z" translate="(0, 0)" style="fill:none; stroke:#231f20;"/>\n')
        fp.write('</svg>\n')
        fp.close()

    @staticmethod
    def _combine_subpath_matrices(matrices):
        def combine(c0, c1):
            return np.append(c0, c1, axis=0)
        return reduce(combine, matrices).astype(np.int32)

    def _cull_small_contours(self, contours):
        MIN_CONTOUR_LEN = 10
        min_length_lambda = lambda c: cv2.arcLength(c, closed=True)\
                            > MIN_CONTOUR_LEN
        culled_contours = list(filter(min_length_lambda, contours))
        return culled_contours
    @staticmethod
    def _parse_translate_attr(translate_attr):
        '''
        E.g. input 'translate(0.13 0.13)'
        Output (0.13 + 0.13j)
        '''
        bare_str = translate_attr.lstrip('translate(').rstrip(')')
        str_lst = bare_str.split(' ')
        return complex(float(str_lst[0]), float(str_lst[1]))

if __name__ == '__main__':
    contours = Loader.extract_contours_from_img_file('images/real-nadya-sig.jpg')
    # edge_img = contours[0]
    # print(edge_img.shape)
    # edge_img = cv2.dilate(edge_img, np.ones((3, 3)))
    # edge_img = cv2.erode(edge_img, np.ones((5, 5)))
    # cv2.namedWindow('extracted edge', 500)
    # cv2.imshow('extracted edge', edge_img)
    # cv2.waitKey()

