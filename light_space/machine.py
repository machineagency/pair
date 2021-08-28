from pyaxidraw import axidraw

class Machine:
    def __init__(self, port='/dev/tty.usbmodem14101', dry=True):
        self.dry = dry
        if not self.dry:
            self.ad = axidraw.AxiDraw()
            self.ad.interactive()
            self.ad.options.units = 1 # Use centimeters
            self.ad.connect()
        else:
            print('Running in DRY mode.')

    def pen_up(self):
        if not self.dry:
            self.ad.penup()
        return 'pen_up'

    def pen_down(self):
        if not self.dry:
            self.ad.pendown()
        return 'pen_down'

    def line(self, pt):
        if not self.dry:
            self.ad.lineto(pt[0], pt[1])
        return f'line {pt}'

    def travel(self, pt):
        if not self.dry:
            self.ad.moveto(pt[0], pt[1])
        return f'travel {pt}'

    def disconnect(self):
        if not self.dry:
            self.ad.disconnect()
        return 'disconnect'

    def return_to_origin(self):
        if not self.dry:
            self.travel((0, 0))
        return 'return_to_origin'

    def plot_rect_hw(self, start_pt, height, width):
        if not self.dry:
            pt1 = (start_pt[0] + width, start_pt[1])
            pt2 = (start_pt[0] + width, start_pt[1] + height)
            pt3 = (start_pt[0], start_pt[1] + height)
            self.travel(start_pt)
            self.line(pt1)
            self.line(pt2)
            self.line(pt3)
            self.line(start_pt)
            self.pen_up()
        return f'square at {start_pt} height {height} width {width}'

    def plot_svg(self, filepath):
        if not self.dry:
            self.ad.plot_setup(filepath)
            self.ad.plot_run()
        return f'plotted {filepath}'

