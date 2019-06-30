DEFAULT_FEED_RATE = 500

def travel(x, y, z=None):
    if z:
        return "G1 X{0} Y{1} Z{2} F{3}".format(x, y, z, DEFAULT_FEED_RATE)
    return "G1 X{0} Y{1} F{2}".format(x, y, DEFAULT_FEED_RATE)

