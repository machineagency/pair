import numpy as np
import svgpathtools as pt
import math
from functools import reduce

class Loader:
    def __init__(self):
        pass

    def load_svg(self, filepath):
        paths, attrs = pt.svg2paths(filepath)
        contours = []
        T_SAMP = 10
        for idx, path in enumerate(paths):
            subpath_matrices = []
            try:
                translate_attr = attrs[idx]['transform']
                translate_num = self._parse_translate_attr(translate_attr)
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
            contours.append(self._combine_subpath_matrices(subpath_matrices))
        return contours

    def export_contours_as_svg(self, contours, title):
        CM_TO_PX = 37.7952755906
        fp = open(f'output_vectors/{title}.svg', mode='w+')
        fp.write(f'<svg id="{title}" data-name="{title}">\n')
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
        for contour in contours:
            fp.write('<path class="class" d="M')
            for point in contour:
                pt_tup = (point[0, 0] / CM_TO_PX, point[0, 1] / CM_TO_PX)
                fp.write(f'{"%.2f"%(pt_tup[0])},{"%.2f"%(pt_tup[1])} ')
            fp.write('"/>\n')
        fp.write('</svg>\n')
        fp.close()

    def _combine_subpath_matrices(self, matrices):
        def combine(c0, c1):
            return np.append(c0, c1, axis=0)
        return reduce(combine, matrices).astype(np.int32)

    def _parse_translate_attr(self, translate_attr):
        '''
        E.g. input 'translate(0.13 0.13)'
        Output (0.13 + 0.13j)
        '''
        bare_str = translate_attr.lstrip('translate(').rstrip(')')
        str_lst = bare_str.split(' ')
        return complex(float(str_lst[0]), float(str_lst[1]))

if __name__ == '__main__':
    loader = Loader()
    contours = loader.load_svg('test_images/secret/nadya-sig.svg')
    print(contours[0].shape)

