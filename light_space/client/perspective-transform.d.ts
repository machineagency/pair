declare interface Homography {
        coeffs: number[];
        coeffsInv: number[];
        srcPts: number[];
        dstPts: number[];
}
declare function PerspT(srcPts : number[], dstPts: number[]) : Homography;
