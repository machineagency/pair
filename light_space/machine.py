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
        if self.dry:
            return 'pen_up'
        self.ad.penup()

    def pen_down(self):
        if self.dry:
            return 'pen_down'
        self.ad.pendown()

    def line(self, pt):
        if self.dry:
            return f'line {pt}'
        self.ad.lineto(pt[0], pt[1])

    def travel(self, pt):
        if self.dry:
            return f'travel {pt}'
        self.ad.moveto(pt[0], pt[1])

    def disconnect(self):
        if self.dry:
            return 'disconnect'
        self.ad.disconnect()

