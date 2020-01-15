from pyaxidraw import axidraw

class Machine:
    def __init__(self, port='/dev/tty.usbmodem14101', dry=True):
        self.dry = dry
        if not self.dry:
            self.ad = axidraw.AxiDraw()
            self.ad.interactive()
            self.ad.options.units = 1 # Use centimeters
            self.ad.connect()

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

