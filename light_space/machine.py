from pyaxidraw import axidraw

class Machine:
    def __init__(self, port='/dev/tty.usbmodem14101'):
        self.ad = axidraw.AxiDraw()
        self.ad.interactive()
        self.ad.options.units = 1 # Use centimeters
        self.ad.connect()

    def pen_up(self):
        self.ad.penup()

    def pen_down(self):
        self.ad.pendown()

    def line(self, pt):
        self.ad.lineto(pt[0], pt[1])

    def travel(self, pt):
        self.ad.moveto(pt[0], pt[1])

    def disconnect(self):
        self.ad.disconnect()

