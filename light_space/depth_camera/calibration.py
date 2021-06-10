import pyrealsense2 as rs
from cv2 import aruco
import sys

# from: https://www.morethantechnical.com/2017/11/17/projector-camera-calibration-the-easy-way/

# --------- detect ChAruco board -----------
corners, ids, rejected = aruco.detectMarkers(frame, cb.dictionary)

corners, ids, rejected, recovered = cv2.aruco.refineDetectedMarkers(frame, cb, corners, ids, rejected, cameraMatrix=K, distCoeffs=dist_coef)

if corners == None or len(corners) == 0:
    # continue
    sys.exit()

ret, charucoCorners, charucoIds = cv2.aruco.interpolateCornersCharuco(corners, ids, frame, cb)
charucoCornersAccum += [charucoCorners]
charucoIdsAccum += [charucoIds]

if number_charuco_views == 40:
    print("calibrate camera")
    print("camera calib mat before\n%s"%K)
    # calibrate camera
    ret, K, dist_coef, rvecs, tvecs = cv2.aruco.calibrateCameraCharuco(charucoCornersAccum,
                                                                       charucoIdsAccum,
                                                                       cb,
                                                                       (w, h),
                                                                       K,
                                                                       dist_coef,
                                                                       flags = cv2.CALIB_USE_INTRINSIC_GUESS)
    print("camera calib mat after\n%s"%K)
    print("camera dist_coef %s"%dist_coef.T)
    print("calibration reproj err %s"%ret)

# --------- detect circles -----------
ret, circles = cv2.findCirclesGrid(gray, circles_grid_size, flags=cv2.CALIB_CB_SYMMETRIC_GRID)
img = cv2.drawChessboardCorners(img, circles_grid_size, circles, ret)
# ray-plane intersection: circle-center to chessboard-plane
circles3D = intersectCirclesRaysToBoard(circles, rvec, tvec, K, dist_coef)
# re-project on camera for verification
circles3D_reprojected, _ = cv2.projectPoints(circles3D, (0,0,0), (0,0,0), K, dist_coef)
for c in circles3D_reprojected:
    cv2.circle(img, tuple(c.astype(np.int32)[0]), 3, (255,255,0), cv2.FILLED)

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

