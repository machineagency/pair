declare interface Homography {
    coeffs: number[];
    coeffsInv: number[];
    srcPts: number[];
    dstPts: number[];
    transform(x: number, y: number) : number[];
    transformInverse(x: number, y: number) : number[];
}

declare function PerspT(srcPts : number[], dstPts: number[]) : Homography;
