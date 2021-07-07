import pyautogui as pg
import enum
import time

class State(enum.Enum):
    up = 0
    down = 1

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
        self.state = State.up
        self.down_point = (0, 0)
        self.current_point = (0, 0)
        self.last_down_time = 0
        self.last_up_time = 0
        # We must receive no points for this many milliseconds to transition
        # from mousedown to mouseup
        self.UP_THRESH_MS = 500
        self.DOWN_THRESH_MS = 200
        # Using L1 distance, the mouse must move this many pixels in either
        # direction to emit a mouse move event
        self.MIN_MOVE_DELTA = 2
        self.MAX_MOVE_FOR_CLICK = 5
        print('Mouse FSM initialized')

    def pass_points(self, pts):
        """
        Can be passed empty points (null events).
        TODO: handle list of points for multi touch
        """
        # Check time on idle for possible mouse up
        # UP + empty point -> UP
        # DOWN + empty point (for enough time) -> UP
        if len(pts) == 0:
            if self.state == State.down and time.time() \
                    - self.last_down_time > self.UP_THRESH_MS / 1000:
                self.state = State.up
                self.last_up_time = time.time()
                pg.mouseUp()
                print('Mouse up')

        # Handle non-idle points
        else:
            # TODO: handle multi touch, for now, only retain the first point
            pt = pts[0]
            if pt[0] < 0 or pt[1] < 0:
                return

            self.last_point_time = time.time()

            # UP + nonempty point -> DOWN (after enough time)
            if self.state == State.up and time.time() \
                    - self.last_up_time > self.DOWN_THRESH_MS / 1000:
                self.state = State.down
                self.down_point = pt
                self.current_point = pt
                pg.moveTo(*pt)
                pg.mouseDown()
                print('Mouse down')
            # DOWN + nonempty point -> DOWN
            else:
                pg.moveTo(*pt)




