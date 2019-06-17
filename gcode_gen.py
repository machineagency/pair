def travel(x, y, z=None):
    if z:
        return "G1 X{0} Y{1} Z{2}".format(x, y, z)
    return "G1 X{0} Y{1}".format(x, y)

