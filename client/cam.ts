import { Geometry } from './verso.js'

type OperationType = 'engrave' | 'pocket' | 'drill';
interface Operation {
    name: string;
    operationType: OperationType;
    speed: number;
};

class Cam {
    protected geometry: Geometry;
    private svg?: XMLDocument;

    constructor(geometry: Geometry) {
        this.geometry = geometry;
        if (geometry.stringRep) {
            this.svg = this.parseSvg(geometry.stringRep);
        }
        else {
            console.error('Could not load geometry data into CAM object.');
        }
    }

    get paths() {
        if (!this.svg || !this.svg.rootElement) {
            return [];
        }
        let rootChildren = Array.from(this.svg.rootElement.children);
        return rootChildren.filter((node) : node is SVGPathElement => {
            return node.tagName === 'path'
        });
    }

    parseSvg(stringRep: string): XMLDocument {
        let domParser = new DOMParser();
        let parseFlag: DOMParserSupportedType = 'image/svg+xml';
        let svg = domParser.parseFromString(stringRep, parseFlag);
        return svg
    }

    getGcode() {
        let pointSets = this.paths.map((path) => this.getPointsFromPath(path));
        let preamble = Cam.codegenPreamble();
        let pathCodeBlocks = pointSets.map((ps) => Cam.codegenPathPoints(ps));
        let postabmble = Cam.codegenPostamble();
        return preamble.concat(pathCodeBlocks.flat()).concat(postabmble);
    }

    /**
     * NOTE: for now we ignore curve data and just discretize as lines.
     */
    private getPointsFromPath(path: SVGPathElement): SVGPoint[] {
        // TODO: allow different resolutions
        const STEP_SIZE = 1;
        const SAMPLE_FACTOR = 1;
        let numSamples = Math.ceil(path.getTotalLength()) * SAMPLE_FACTOR;
        let samplePoints = [...Array(numSamples * SAMPLE_FACTOR).keys()];
        let points = samplePoints.map((sampleDist) => {
            return path.getPointAtLength(sampleDist / SAMPLE_FACTOR);
        });
        if (!this.svg) {
            return points;
        }
        if (!this.svg.rootElement
            || this.svg.rootElement.transform.baseVal.numberOfItems < 1) {
            return points;
        }
        let globalTransform = this.svg.rootElement.transform.baseVal.getItem(0);
        let transformedPoints = points.map((pt) => {
            if (!globalTransform) {
                return pt;
            }
            else {
                return pt.matrixTransform(globalTransform.matrix);
            }
        });
        return transformedPoints;
    }

    private static codegenPreamble() {
        const opParamZHigh = 20;
        const opParamTravelSpeed = 50;
        let gCodes = [];
        gCodes.push(`G21 ; Set units to mm.`);
        gCodes.push(`G90 ; Absolute positioning.`);
        gCodes.push(`G0 Z${opParamZHigh} F${opParamTravelSpeed} ; Move to clearance level.`);
        return gCodes;
    }

    private static codegenPostamble() {
        return [ 'G0 X0 Y0' ];
    }

    /**
     * For a set of path points:
     * 1. Assume tool is in the air at z=UP.
     * 2. Move tool to initial point.
     * 3. Plunge tool to z=DOWN.
     * 4. Set feed rate.
     * 5. Linear move to every point with z=DOWN.
     * 6. At the end, retract tool to z=UP.
     */
    private static codegenPathPoints(points: SVGPoint[]) {
        if (points.length < 2) {
            throw new Error('Path points are not long enough');
        }
        // TODO: store params in an operation instead
        const opParamZHigh = 20;
        const opParamZLow = 0;
        const opParamTravelSpeed = 50;
        const opParamPlungeSpeed = 10;
        const opParamCutSpeed = 20;
        const opParamRetractSpeed = 10;

        let gCodes = [];

        let truncatedPoints = points.map((point) => {
            const places = 4;
            return {
                x: Cam.truncateDecimal(point.x, places),
                y: Cam.truncateDecimal(point.y, places)
            }
        });

        let initialPoint = truncatedPoints[0];
        gCodes.push(`; ---begin path---`);
        gCodes.push(`; travel to initial`);
        gCodes.push(`G0 X${initialPoint.x} Y${initialPoint.y}`);
        gCodes.push(`;  set plunge rates`);
        gCodes.push(`G0 F${opParamPlungeSpeed}`);
        gCodes.push(`;  plunge`);
        gCodes.push(`G0 Z${opParamZLow}`);
        gCodes.push(`;  set cut rates`);
        gCodes.push(`G0 F${opParamCutSpeed}`);
        gCodes.push(`;  cuts`);
        let cuts = truncatedPoints.slice(1).forEach((point) => {
            gCodes.push(`G0 X${point.x} Y${point.y}`);
        });
        gCodes.push(`;  set retract rates`);
        gCodes.push(`G0 F${opParamRetractSpeed}`);
        gCodes.push(`;  retract`);
        gCodes.push(`G0 Z${opParamZHigh}`);
        gCodes.push(`;  set travel rates`);
        gCodes.push(`G0 F${opParamTravelSpeed}`);
        gCodes.push(`; ---end path---`);
        return gCodes;
    }

    private static truncateDecimal(num: number, places: number): string {
        var re = new RegExp('^-?\\d+(?:\.\\d{0,' + (places || -1) + '})?');
        let maybeMatch = num.toString().match(re);
        return maybeMatch ? maybeMatch[0] : num.toString();
    }
}

export { Cam }
