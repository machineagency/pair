from pyaxidraw import axidraw

class Machine:
    def __init__(self, port='/dev/tty.usbmodem14101'):
        self.pen_is_up = False
        self.port = port
        self.baudrate = 115200
        try:
        self.serial = serial.Serial(port=port, baudrate=default_baudrate)

    def pen_up():
        pass

    def pen_down();
        pass

    def draw_to_pt(pt):
        pass

    def travel_to_pt(pt):
        pass

