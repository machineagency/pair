import pyrealsense2 as rs
import cv2
import numpy as np
from cv2 import aruco
import sys

# from: https://www.morethantechnical.com/2017/11/17/projector-camera-calibration-the-easy-way/

def intersectCirclesRaysToBoard(circles, rvec, t, K, dist_coef):
    circles_normalized = cv2.convertPointsToHomogeneous(cv2.undistortPoints(circles, K, dist_coef))
    if not rvec.size:
        return None
    R, _ = cv2.Rodrigues(rvec)
    # https://stackoverflow.com/questions/5666222/3d-line-plane-intersection
    plane_normal = R[2,:] # last row of plane rotation matrix is normal to plane
    plane_point = t.T     # t is a point on the plane
    epsilon = 1e-06
    circles_3d = np.zeros((0,3), dtype=np.float32)
    for p in circles_normalized:
        ray_direction = p / np.linalg.norm(p)
        ray_point = p
        ndotu = plane_normal.dot(ray_direction.T)
        if abs(ndotu) < epsilon:
            print ("no intersection or line is within plane")
        w = ray_point - plane_point
        si = -plane_normal.dot(w.T) / ndotu
        Psi = w + si * ray_direction + plane_point
        circles_3d = np.append(circles_3d, Psi, axis = 0)
    return circles_3d

video_capture = cv2.VideoCapture('trial_1.mov')
if not video_capture.isOpened():
    print('Could not open video file.')
    sys.exit(1)

charucoCornersAccum = []
charucoIdsAccum = []
number_charuco_views = 0
K = np.array([[1., 0., 1.], [0., 1., 1.], [0., 0., 1.]])
dist_coef = np.ones((12,))
img_width = 640
img_height = 480
aruco_dict = aruco.Dictionary_get(aruco.DICT_6X6_250)
board = cv2.aruco.CharucoBoard_create(7, 5, 0.01861, 0.01117, aruco_dict)

while video_capture.isOpened():
    frame_read_success, frame = video_capture.read()
    if not frame_read_success:
        continue
    # --------- detect ChAruco board -----------
    corners, ids, rejected = aruco.detectMarkers(frame, aruco_dict)
    corners, ids, rejected, recovered = cv2.aruco.refineDetectedMarkers(frame,\
            board, corners, ids, rejected, cameraMatrix=K, distCoeffs=dist_coef)

    if corners == None or len(corners) == 0:
        continue
        # sys.exit()

    num_detect, charucoCorners, charucoIds = cv2.aruco.interpolateCornersCharuco( \
            corners, ids, frame, board)
    min_detects = 4
    if (num_detect >= min_detects):
        charucoCornersAccum += [charucoCorners]
        charucoIdsAccum += [charucoIds]
        number_charuco_views += 1

    if number_charuco_views == 40:
        print("calibrate camera")
        print("camera calib mat before\n%s"%K)
        # calibrate camera
        ret, K, dist_coef, rvecs, tvecs = cv2.aruco.\
                calibrateCameraCharuco(charucoCornersAccum,
                                       charucoIdsAccum,
                                       board,
                                       (img_width, img_height),
                                       K,
                                       dist_coef,
                                       flags = cv2.CALIB_USE_INTRINSIC_GUESS)
        print("camera calib mat after\n%s"%K)
        print("camera dist_coef %s"%dist_coef.T)
        print("calibration reproj err %s"%ret)
        sys.exit(0)

sys.exit(0)

# --------- detect circles -----------
ret, circles = cv2.findCirclesGrid(gray, circles_grid_size, flags=cv2.CALIB_CB_SYMMETRIC_GRID)
img = cv2.drawChessboardCorners(img, circles_grid_size, circles, ret)
# ray-plane intersection: circle-center to chessboard-plane
circles3D = intersectCirclesRaysToBoard(circles, rvec, tvec, K, dist_coef)
# re-project on camera for verification
circles3D_reprojected, _ = cv2.projectPoints(circles3D, (0,0,0), (0,0,0), K, dist_coef)
for c in circles3D_reprojected:
    cv2.circle(img, tuple(c.astype(np.int32)[0]), 3, (255,255,0), cv2.FILLED)

# calibrate projector
print("calibrate projector")
print("proj calib mat before\n%s"%K_proj)
ret, K_proj, dist_coef_proj, rvecs, tvecs = cv2.calibrateCamera(objectPointsAccum,
                                                                projCirclePoints,
                                                                (w_proj, h_proj),
                                                                K_proj,
                                                                dist_coef_proj,
                                                                flags = cv2.CALIB_USE_INTRINSIC_GUESS)
print("proj calib mat after\n%s"%K_proj)
print("proj dist_coef %s"%dist_coef_proj.T)
print("calibration reproj err %s"%ret)
print("stereo calibration")
ret, K, dist_coef, K_proj, dist_coef_proj, proj_R, proj_T, _, _ = cv2.stereoCalibrate(
        objectPointsAccum,
        cameraCirclePoints,
        projCirclePoints,
        K,
        dist_coef,
        K_proj,
        dist_coef_proj,
        (w,h),
        flags = cv2.CALIB_USE_INTRINSIC_GUESS
        )
proj_rvec, _ = cv2.Rodrigues(proj_R)
print("R \n%s"%proj_R)
print("T %s"%proj_T.T)
print("proj calib mat after\n%s"%K_proj)
print("proj dist_coef %s"       %dist_coef_proj.T)
print("cam calib mat after\n%s" %K)
print("cam dist_coef %s"        %dist_coef.T)
print("reproj err %f"%ret)

