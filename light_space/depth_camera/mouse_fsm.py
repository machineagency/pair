import pyautogui as pg

class MouseFsm:
    """
    We model a mouse as an FSM that receives a stream of points from the camera
    system and emits hardware mouse events.

    This FSM has two states: down and up. If we transition U->D->U where the
    D->U transition happens in a location not too far from the U-> transition,
    emit a click. If the state is down, and the stream of points moves enough,
    then we updates the current point.
    """
    def __init__(self):
        self.current_point = (0, 0)
        # We must receive no points for this many milliseconds to transition
        # from mousedown to mouseup
        self.UP_THRESH_MS = 200
        # Using L1 distance, the mouse must move this many pixels in either
        # direction to emit a mouse move event
        self.MIN_MOVE_DELTA = 2
        self.MAX_MOVE_FOR_CLICK = 5

    def pass_point(self, pt):
        pass

