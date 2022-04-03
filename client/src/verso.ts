/// <reference path="perspective-transform.d.ts" />
import * as THREE from 'three';
import Paper from 'paper';
import { OrbitControls } from 'three-orbitcontrols-ts';

/** This file contains all primitives in the (expanded) Verso language.
 */

export type Instruction = string;
export type GeometryFiletype = 'svg' | 'stl';
export type ISA = 'gcode' | 'ebb' | 'unknown';
export type Axis = 'x' | 'y' | 'z' | 'u' | 'w';

interface VersoNameable extends paper.Group {
    versoName: string;
    versoType: string;
}

interface HitOptions {
    segments?: boolean;
    stroke?: boolean;
    fill?: boolean;
    tolerance?: number;
}

enum InteractionMode {
    defaultState,
    adjustEnvelope
}

const MM_TO_PX = 3.7795275591;
const PX_TO_MM = 0.2645833333;
const BASE_URL = '';

// TODO: develop a bona fide type for units and enforce type checks
export const mm = (valueInMm: number) => {
    return valueInMm * MM_TO_PX;
}
export const px = (valueInPx: number) => {
    return valueInPx * PX_TO_MM;
}

const __idenPts = [0, 0, 0, 0, 0, 0, 0, 0];

export class Tabletop {
    machine: Machine;
    project: paper.Project;
    tool: paper.Tool;
    workEnvelope: WorkEnvelope;
    toolpaths: Toolpath[];
    interactionMode: InteractionMode;
    activeToolpath?: Toolpath;
    activeEnvelopeSegment?: paper.Segment;
    moveEntireEnvelope: boolean;
    vizLayer: paper.Layer;

    constructor(machine: Machine) {
        this.machine = machine;
        this.project = Paper.project;
        this.tool = Paper.tool || new Paper.Tool();
        this.toolpaths = [];
        this.workEnvelope = new WorkEnvelope(this,
                                             machine.workEnvelopeDimensions.x,
                                             machine.workEnvelopeDimensions.y);
        this.interactionMode = InteractionMode.defaultState;
        this.moveEntireEnvelope = false;
        this.initMouseHandlers();
        this.vizLayer = new Paper.Layer();
        this.project.addLayer(this.vizLayer);
    }

    toString() {
        return `Tabletop(machine: ${this.machine}, workEnvelope: ${this.workEnvelope})`;
    }

    initMouseHandlers() {
        const hitOptions = {
            segments: true,
            stroke: true,
            fill: true,
            tolerance: 10
        };
        this.tool.onMouseDown = (event: paper.MouseEvent,
                                 hitOptions: HitOptions) => {
            // Mode: Adjust Envelope
            if (this.interactionMode === InteractionMode.adjustEnvelope) {
                let labelOptions = {
                    tolerance: 20,
                    fill: true
                };
                let envPathOptions = {
                    segments: true,
                    stroke: true,
                    tolerance: 15
                };
                let labelHitResult = this.workEnvelope.sizeLabel
                                     .hitTest(event.point, labelOptions);
                let envPathHitResult = this.workEnvelope.path
                                     .hitTest(event.point, envPathOptions);
                if (labelHitResult) {
                    // TODO: make this more proper.
                    let sizeString = prompt('Enter envelope size: [width, height].');
                    if (sizeString) {
                        let size = new Paper.Size(JSON.parse(sizeString));
                        this.workEnvelope.redrawForSize(size);
                        this.interactionMode = InteractionMode.defaultState;
                    }
                }
                else if (envPathHitResult) {
                    if (envPathHitResult.type === 'stroke') {
                        this.moveEntireEnvelope = true;
                    }
                    else if (envPathHitResult.type === 'segment') {
                        this.activeEnvelopeSegment = envPathHitResult.segment;
                    }
                }
                return;
            }

            this.activeToolpath = undefined;
        };
        this.tool.onMouseDrag = (event: paper.MouseEvent,
                                 hitOptions: HitOptions) => {
            if (this.activeToolpath) {
                // this.activeToolpath.position = this.activeToolpath.position.add(event.delta);
            }
            if (this.interactionMode === InteractionMode.adjustEnvelope) {
                if (this.moveEntireEnvelope) {
                    this.workEnvelope.path.position = this.workEnvelope.path
                        .position.add(event.delta);
                }
                else if (this.activeEnvelopeSegment) {
                    this.activeEnvelopeSegment.point = this.activeEnvelopeSegment
                        .point.add(event.delta);
                }
            }
        };
        this.tool.onMouseUp = (event: paper.MouseEvent,
                               hitOptions: HitOptions) => {
            this.moveEntireEnvelope = false;
        };
        this.tool.onKeyUp = (event: paper.KeyEvent,
                             hitOptions: HitOptions) => {
            if (event.key === 'e') {
                if (this.interactionMode === InteractionMode.adjustEnvelope) {
                    this.toggleWorkEnvelopeCalibration();
                }
                else {
                    this.calculateHomographyFromCalibration();
                }
            }
            // TODO: think about how to handle copy and application of
            // transforms. Also if possible, create graphical elements
            // for keypresses.
            if (event.key === 'b') {
                let wePathCopy = this.workEnvelope.path.clone({
                    deep: true,
                    insert: false
                });
                let wePathGroup = new Paper.Group([ wePathCopy ]);
                this.workEnvelope.applyInverseHomography(wePathGroup);
                this.sendPaperItemToMachine(wePathGroup);
                wePathGroup.remove();
            }
            if (event.key === 't') {
                if (this.activeToolpath) {
                    let tpGroupCopy = this.activeToolpath.vizGroup.clone({
                        deep: true,
                        insert: false
                    });
                    this.workEnvelope.applyInverseHomography(tpGroupCopy);
                    this.sendPaperItemToMachine(tpGroupCopy);
                }
            }
        };
    }

    toggleWorkEnvelopeCalibration() : void {
        this.workEnvelope.path.selected = true;
        this.interactionMode = InteractionMode.adjustEnvelope;
        this.workEnvelope.sizeLabel.fillColor = new Paper.Color('cyan');
    }

    calculateHomographyFromCalibration() : Homography {
        this.workEnvelope.path.selected = false;
        this.interactionMode = InteractionMode.defaultState;
        this.workEnvelope.sizeLabel.fillColor = new Paper.Color('red');
        let h = this.workEnvelope.calculateHomography();
        return h;
    }

    loadToolpath(toolpath: Toolpath) {
        this.toolpaths.push(toolpath);
        toolpath.visible = true;
    }

    // This should be deprecated
    clearToolpaths() {
        // this.toolpaths.forEach(tp => tp.clearFromTabletop());
        // this.toolpaths = [];
    }

    clearTabletopFromCanvas() {
        this.workEnvelope.clearFromTabletop();
        this.clearToolpaths();
        console.log('Tabletop cleared.');
    }

    addVizWithName(visualization: paper.Group, name: string) {
        visualization.name = name;
        this.vizLayer.addChild(visualization);
    }

    removeVizWithName(name: string) {
        let maybeViz = this.vizLayer.children.find(v => v.name === name);
        if (maybeViz) {
            maybeViz.remove();
        }
    }

    removeAllViz() {
        this.vizLayer.removeChildren();
    }

    sendPaperItemToMachine(itemToSend: paper.Item) : Promise<Response> {
        // Credit: https://github.com/yoksel/url-encoder/ .
        const urlEncodeSvg = (data: String) : String => {
            const symbols = /[\r\n%#()<>?[\\\]^`{|}]/g;
            data = data.replace(/"/g, `'`);
            data = data.replace(/>\s{1,}</g, `><`);
            data = data.replace(/\s{2,}/g, ` `);
            return data.replace(symbols, encodeURIComponent);
        }
        const headerXmlns = 'xmlns="http://www.w3.org/2000/svg"';
        // If the height and width cause issues, switch them back to a large
        // number, say 300 or 500.
        const headerWidth = `width="${this.workEnvelope.width}mm"`;
        const headerHeight = `height="${this.workEnvelope.height}mm"`;
        const svgHeader = `<svg ${headerXmlns} ${headerWidth} ${headerHeight}>`;
        const svgFooter = `</svg>`;
        const visibleItemCopy = itemToSend.clone({ insert: false, deep: true })
                                    .set({ visible: true });
        const svgPath = itemToSend.exportSVG({
            bounds: 'content',
            asString: true,
            precision: 2
        });
        const svgString = svgHeader + svgPath + svgFooter;
        const encodedSvg = urlEncodeSvg(svgString);
        const url = `${BASE_URL}/machine/drawToolpath?svgString=${encodedSvg}`;
        return fetch(url, {
            method: 'GET'
        });
    }
}

export class WorkEnvelope {
    tabletop: Tabletop;
    width: number;
    height: number;
    strokeWidth: number;
    path: paper.Path = new Paper.Path();
    sizeLabel: paper.PointText;
    originalCornerPoints: paper.Point[];
    private homography: Homography;

    constructor(tabletop: Tabletop, width: number, height: number) {
        this.tabletop = tabletop;
        this.strokeWidth = 3;
        this.width = width * MM_TO_PX;
        this.height = height * MM_TO_PX;
        this.path = this._drawPath();
        this.sizeLabel = this._drawSizeLabel();
        this.originalCornerPoints = this.getCornerPoints();
        this.homography = this.calculateHomography();
    }

    toString() {
        return `WorkEnvelope(`
             + `width (px): ${this.width}, `
             + `height (px) ${this.height}, `
             + `pixelToPhysical: [${this.homography.coeffs}]`
             + `)`;
    }

    _drawPath() : paper.Path {
        let rect = new Paper.Rectangle(
            this.anchor.x,
            this.anchor.y,
            this.width,
            this.height);
        let path = new Paper.Path.Rectangle(rect);
        path.strokeColor = new Paper.Color('red');
        path.strokeWidth = this.strokeWidth;
        return path;
    }

    _drawSizeLabel() : paper.PointText {
        let labelOffset = 30;
        let labelAnchor = new Paper.Point(
            this.anchor.x,
            this.anchor.y + this.height + labelOffset
        );
        let widthMm = Math.round(this.width * PX_TO_MM);
        let heightMm = Math.round(this.height * PX_TO_MM);
        let sizeLabel = new Paper.PointText({
            point: labelAnchor,
            content: `(${widthMm}, ${heightMm})`,
            fillColor: 'red',
            fontFamily: 'Courier New',
            fontWeight: 'bold',
            fontSize: labelOffset - 5
        });
        return sizeLabel;
    }

    get anchor() : paper.Point {
        return new Paper.Point(this.strokeWidth * MM_TO_PX,
                               this.strokeWidth * MM_TO_PX);
    }

    get center() : paper.Point {
        return new Paper.Point(Math.floor(this.width / 2),
                               Math.floor(this.height / 2));
    }

    clearFromTabletop() {
        let pathRemoveResult = this.path.remove();
        let labelRemoveResult = this.sizeLabel.remove();
        if (!(pathRemoveResult && labelRemoveResult)) {
            console.warn('Could not clear workEnvelope from tabletop.');
        }
    }

    getCornerPoints() : paper.Point[] {
        return this.path.segments.map(segment => segment.point.clone());
    }

    calculateHomography() : Homography {
        let unpackPoint = (pt: paper.Point) => [pt.x, pt.y];
        let srcFlat = this.originalCornerPoints.map(unpackPoint).flat();
        let dstFlat = this.getCornerPoints().map(unpackPoint).flat();
        let h = PerspT(srcFlat, dstFlat);
        return h;
    }

    setHomographyAndRedrawCorners(h: Homography) {
        this.path.segments.forEach((segment, cornerNumber) => {
            let xIdx = cornerNumber * 2;
            let yIdx = (cornerNumber * 2) + 1;
            segment.point.x = h.dstPts[xIdx];
            segment.point.y = h.dstPts[yIdx];
        });
        this.homography = h;
    };

    redrawForSize(newSize: paper.Size) {
        this.width = newSize.width * MM_TO_PX;
        this.height = newSize.height * MM_TO_PX;
        this.path.remove();
        this.sizeLabel.remove();
        this.path = this._drawPath();
        this.sizeLabel = this._drawSizeLabel();
        this.originalCornerPoints = this.getCornerPoints();
    }

    applyHomographyToGroup(g: paper.Group) {
        let h = this.homography;
        let boundTransformMethod = h.transform.bind(h);
        this._pointwisePathTransform(g, boundTransformMethod);
    }

    applyInverseHomography(g: paper.Group) {
        let h = this.homography;
        let boundTransformMethod = h.transformInverse.bind(h);
        this._pointwisePathTransform(g, boundTransformMethod);
    }

    _pointwisePathTransform(groupToTransform: paper.Group,
                            transform: (x: number, y:number) => number[]) {
        let unpackSegment = (seg: paper.Segment) => [seg.point.x, seg.point.y];
        let unpackHandleIn = (seg: paper.Segment) => [seg.handleIn.x, seg.handleIn.y];
        let unpackHandleOut = (seg: paper.Segment) => [seg.handleOut.x, seg.handleOut.y];
        let transformPt = (pt: number[]) => transform(pt[0], pt[1]);
        groupToTransform.children.forEach((child) => {
            if (child instanceof Paper.Path) {
                let segPoints: number[][] = child.segments.map(unpackSegment);
                let handlesIn = child.segments.map(unpackHandleIn);
                let handlesOut = child.segments.map(unpackHandleOut);
                let transPts = segPoints.map(transformPt);
                let newSegs = transPts.map((pt, idx) => {
                    let newPt = new Paper.Point(pt[0], pt[1]);
                    let hIn = handlesIn[idx];
                    let hOut = handlesOut[idx];
                    // Apparently we don't want to apply the homography to
                    // handles. If we do, we get wildly large handle positions
                    // from moving the upper left corner.
                    let oldHIn = new Paper.Point(hIn[0], hIn[1]);
                    let oldHOut = new Paper.Point(hOut[0], hOut[1]);
                    return new Paper.Segment(newPt, oldHIn, oldHOut);
                });
                child.segments = newSegs;
                child.visible = true;
            }
        });
    }
}

export class Toolpath {
    geometryUrl: string;
    isa: ISA;
    instructions: string[];
    vizGroup: paper.Group;

    constructor(geometryUrl: string, instructions: string[]) {
        this.geometryUrl = geometryUrl;
        this.instructions = instructions;
        this.vizGroup = new Paper.Group();
        this.isa = this.recognizeIsa(instructions);
        // TODO: vizGroup should be populated by the toolpath visualizers
        // and then rendered to the tabletop.
    }

    recognizeIsa(instructions: string[]) : ISA {
        if (instructions.length < 1) {
            return 'unknown'
        }
        let testInst = instructions[0];
        if (testInst.match(',')) {
            return 'ebb';
        }
        else if (testInst[0] === 'G' || testInst[0] === 'M') {
            return 'gcode';
        }
        else {
            return 'unknown';
        }
    }

    get position() {
        return this.vizGroup.position;
    }

    get visible() {
        return this.vizGroup.visible;
    }

    set visible(newVisibility: boolean) {
        this.vizGroup.visible = newVisibility;
    }
}

/**
 * Verso-level point object, one abstraction layer higher than paper.Point.
 */
export class Point {
    paperPoint: paper.Point;

    constructor(x: number, y: number) {
        this.paperPoint = new Paper.Point(x, y);
    }

    get x() {
        return this.paperPoint.x;
    }

    get y() {
        return this.paperPoint.y;
    }

    // NOTE: for some reason, a non-modifying version of this seems to cause
    // problems.
    add(x: number, y: number) {
        this.paperPoint.x += x;
        this.paperPoint.y += y;
        return this;
    }

    toString() {
        return `(${this.x}, ${this.y})`;
    }

    flatten() : number[] {
        return [this.x, this.y];
    }
}

export class Region {
    name: string;
    corners: Point[];
    _paperObj?: paper.Group;

    constructor(name: string, corners: Point[]) {
        this.name = name;
        this.corners = corners;
    }

    get width() {
        let minX = this.corners.reduce((soFar, pt) => {
            return pt.x < soFar ? pt.x : soFar;
        }, Infinity);
        let maxX = this.corners.reduce((soFar, pt) => {
            return pt.x > soFar ? pt.x : soFar;
        }, -Infinity);
        return maxX - minX;
    }

    get height() {
        let minY = this.corners.reduce((soFar, pt) => {
            return pt.y < soFar ? pt.y : soFar;
        }, Infinity);
        let maxY = this.corners.reduce((soFar, pt) => {
            return pt.y > soFar ? pt.y : soFar;
        }, -Infinity);
        return maxY - minY;
    }

    get centroid() : Point {
        let xSum = this.corners.reduce((soFar, pt) => soFar + pt.x, 0);
        let ySum = this.corners.reduce((soFar, pt) => soFar + pt.y, 0);
        return new Point(xSum / this.corners.length, ySum / this.corners.length);
    }

    drawOnTabletop(tabletop: Tabletop) {
        let from: paper.Point = this.corners[0].paperPoint;
        let to: paper.Point = this.corners[3].paperPoint;
        let rectPath = new Paper.Path.Rectangle(from, to);
        let paperGroup = new Paper.Group([rectPath]);
        tabletop.workEnvelope.applyHomographyToGroup(paperGroup);
        paperGroup.position.set(this.centroid.paperPoint);
        paperGroup.strokeColor = new Paper.Color(0x00ff00);
        paperGroup.strokeWidth = 1;
        tabletop.project.activeLayer.addChild(paperGroup);
        this._paperObj = paperGroup;
    }

    clearFromTabletop() {
        if (this._paperObj) {
            let result = this._paperObj.remove();
            if (!result) {
                console.warn(`Could not remove region ${this}`);
            }
        }
    }

    toString() {
        return this.corners.map(c => c.toString()).toString();
    }
}

export class Camera {
    tabletop?: Tabletop;
    extrinsicTransform?: Homography;
    imageToTabletopScale: { x: number, y: number };

    constructor(tabletop?: Tabletop) {
        this.tabletop = tabletop;
        this.imageToTabletopScale = { x: 1, y: 1 };
    }

    toString() {
        let transformCoeffs = this.extrinsicTransform
                                ? this.extrinsicTransform.coeffs.toString()
                                : '?';
        let xScale = this.imageToTabletopScale.x;
        let yScale = this.imageToTabletopScale.y;
        return `Camera(`
             + `extrinsicTransform: [${transformCoeffs}],`
             + `imageToTabletopScale: { x: ${xScale}, y: ${yScale} }`
             + `)`;
    }

    async takePhoto() : Promise<string> {
        if (!this.extrinsicTransform) { return ''; }
        let coeffs = this.extrinsicTransform.coeffs.toString() || '';
        let imageRes = await fetch(`/camera/takePhoto?coeffs=${coeffs}`);
        if (imageRes.ok) {
            let blob = await imageRes.blob();
            let url = URL.createObjectURL(blob);
            return url;
        }
        else {
            return '';
        }
    }

    async findFaceRegions() : Promise<Region[]> {
        interface BoxResponseObj {
            topLeftX: number,
            topLeftY: number,
            width: number,
            height: number
        };
        const url = '/image/detectFaceBoxes';
        let response = await fetch(url);
        let regions : Region[];
        if (response.ok) {
            let resJson = await response.json();
            regions = resJson.results.map((obj: BoxResponseObj, idx: number) => {
                let tl = new Point(
                    Math.round(obj.topLeftX * this.imageToTabletopScale.x),
                    Math.round(obj.topLeftY * this.imageToTabletopScale.y)
                );
                let tr = new Point(
                    Math.round((obj.topLeftX + obj.width) * this.imageToTabletopScale.x),
                    Math.round(obj.topLeftY * this.imageToTabletopScale.y)
                );
                let bl = new Point(
                    Math.round(obj.topLeftX * this.imageToTabletopScale.x),
                    Math.round((obj.topLeftY + obj.height) * this.imageToTabletopScale.y)
                );
                let br = new Point(
                    Math.round((obj.topLeftX + obj.width) * this.imageToTabletopScale.x),
                    Math.round((obj.topLeftY + obj.height) * this.imageToTabletopScale.y)
                );
                let region = new Region(`face ${idx}`, [tl, bl, tr, br]);
                return region;
            });
        }
        else {
            regions = [];
        }
        return new Promise((resolve, reject) => resolve(regions));
    }
}

export class Geometry {
    tabletop: Tabletop;
    paperGroup?: paper.Group;

    // The name of the file for the geometry in the form <NAME>.<FILETYPE>
    filename?: string;

    // A filepath or URL for retrieving the geometry's file, note that this
    // path does not necessarily contain the filetype.
    filepath?: string;

    // The string representation of the geometry e.g. the SVG string
    stringRep: string;

    constructor(tabletop: Tabletop) {
        this.tabletop = tabletop;
        this.stringRep = '<svg></svg>';
    }

    get position() {
        if (this.paperGroup) {
            return this.paperGroup.position;
        }
    }

    get filetype() : GeometryFiletype | undefined {
        if (this.filepath && this.filename) {
            let maybePathSegments = this.filename.split('.');
            if (maybePathSegments && maybePathSegments.length === 2) {
                let maybeFiletype = maybePathSegments[1];
                if (maybeFiletype === 'svg' || maybeFiletype === 'stl') {
                    return maybeFiletype;
                }
            }
        }
    }

    get height() : number {
        if (!this.paperGroup) { return 0; }
        return this.paperGroup.bounds.height || 0;
    }

    get width() : number {
        if (!this.paperGroup) { return 0; }
        return this.paperGroup.bounds.width || 0;
    }

    /** Returns a new verso.Geometry object with placed at the provided
     *  placement point. */
    placeAt(placementPoint: Point) : Geometry {
        if (!this.paperGroup) {
            throw new Error('Cannot place geometry without data loaded.');
        }
        let adjustedPoint = placementPoint.paperPoint.add(this.tabletop.workEnvelope.anchor);
        let newGeom = new Geometry(this.tabletop);
        newGeom.filename = this.filename;
        newGeom.filepath = this.filepath;
        newGeom.paperGroup = this.paperGroup;
        newGeom.paperGroup.position = adjustedPoint;
        // FIXME: again we should be operating on the underlying svg all the time
        // but have time to fix this
        if (!this.position) { throw new Error('bad'); }
        if (this.stringRep) {
            newGeom.stringRep = this
                .calculateTranslatedStringRep(placementPoint.x, placementPoint.y);
        }
        return newGeom;
    }

    private calculateTranslatedStringRep(tx: number, ty: number) {
        if (!this.stringRep) { throw new Error('where is thy string?'); }
        let parser = new DOMParser();
        let xml = parser.parseFromString(this.stringRep, 'image/svg+xml');
        let svg = xml.rootElement;
        if (!svg) { throw new Error('could not parse an svg'); }
        let translateMat = svg.createSVGMatrix().translate(tx, ty);
        let transform = svg.createSVGTransformFromMatrix(translateMat);
        svg.transform.baseVal.appendItem(transform);
        let stringRep = svg.outerHTML;
        return stringRep;
    }

    rotate() {
        // TODO
    }

    scale() {
        // TODO
    }

    async loadRemoteFile(filename: string) : Promise<Geometry> {
       let getUrl = `/geometry/${filename}`;
       let fileResult = await fetch(getUrl);
       if (!fileResult.ok) {
           console.error(`Could not load ${filename} from remote.`);
           return new Promise<Geometry>((resolve) => {
               resolve(this);
           });
       }
       else {
            let blob = await fileResult.clone().blob();
            let localUrl = URL.createObjectURL(blob);
            this.stringRep = (await fileResult.text()).trim();
            return await this.loadIntoPaperCanvas(filename, localUrl);
       }
    }

    // FIXME: deprecate the paper functionality and just work with the string rep
    async loadIntoPaperCanvas(filename: string, filepath: string) : Promise<Geometry> {
        return new Promise<Geometry>((resolve, reject) => {
            this.tabletop.project.importSVG(this.stringRep, {
                expandShapes: true,
                insert: false,
                onError: () => {
                    console.log(this);
                    console.warn('Could not load an SVG');
                    reject();
                },
                onLoad: (item: paper.Group, svgString: string) => {
                    this.tabletop.workEnvelope.applyHomographyToGroup(item);
                    item.strokeColor = new Paper.Color(0xffffff);
                    item.position = new Paper.Point(
                        item.bounds.width * 0.5 + this.tabletop.workEnvelope.anchor.x,
                        item.bounds.height * 0.5 + this.tabletop.workEnvelope.anchor.y
                    );
                    this.paperGroup = item;
                    this.filename = filename;
                    this.filepath = filepath;
                    resolve(this);
                }
            });
        });
    }
}

export class Port {
    path: string;
    baudRate: number;
    isOpen: boolean;
    private backendPortId: number;

    constructor(path: string, baudRate: number) {
        this.path = path;
        this.baudRate = baudRate;
        this.isOpen = false;
        this.backendPortId = -1;
    }

    connect() {
        let url = `/ports?path=${this.path}&baudRate=${this.baudRate}`;
        return new Promise<boolean>((resolve, reject) => {
            return fetch(url, { method: 'PUT' }).then((response) => {
                if (response.ok) {
                    return response.json();
                }
                else {
                    console.error('Tried to open a port, didn\'t get a proper response.');
                    reject();
                }
            }).then((portOpenJson) => {
                if (portOpenJson.id === undefined) {
                    console.error('Tried to open a port, didn\'t get a proper response.');
                    resolve(false);
                }
                this.backendPortId = portOpenJson.id;
                this.isOpen = true;
                resolve(true);
            });
        });
    }

    writeInstructions(instructions: string[]) {
        return new Promise<string>((resolve, reject) => {
            // if (!this.isOpen) { reject() };
            let portId = this.backendPortId;
            let url = `/ports/${portId}/instructions`;
            let body = { instructions: instructions };
            fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json;charset=utf-8'
                },
                body: JSON.stringify(body)
            }).then((response) => {
                if (response.ok) {
                    return response.json();
                }
                else {
                    reject(response.statusText);
                }
            }).then((responseJson) => {
                resolve(responseJson.message);
            }).catch((error) => {
                reject(error);
            });
        });
    }
}

export class Machine {
    machineName: string;
    tabletop?: Tabletop;
    initialized: boolean;
    port?: Port;

    constructor(machineName: string) {
        this.machineName = machineName;
        this.initialized = false;
        // TODO: look up machine name and populate fields—fake it for now
    }

    get workEnvelopeDimensions() {
        switch (this.machineName) {
            case 'axidraw':
                return new Point(280, 180);
            case 'othermill':
                return new Point(200, 200);
            case 'jubilee':
                return new Point(300, 300);
            default:
                return new Point (10, 10);
        }
    }

    drawBorder() {
        // FIXME: doesn't work yet, just use b keypress
        if (this.tabletop) {
            let wePathCopy = this.tabletop.workEnvelope.path.clone({
                deep: true,
                insert: false
            });
            let wePathGroup = new Paper.Group([ wePathCopy ]);
            this.tabletop.workEnvelope.applyInverseHomography(wePathGroup);
            this.tabletop.sendPaperItemToMachine(wePathGroup);
            wePathGroup.remove();
        }
    }

    async compileGeometryToToolpath(geometry: Geometry) : Promise<Toolpath> {
        // Credit: https://github.com/yoksel/url-encoder/ .
        const urlEncodeSvg = (data: String) : String => {
            const symbols = /[\r\n%#()<>?[\\\]^`{|}]/g;
            data = data.replace(/"/g, `'`);
            data = data.replace(/>\s{1,}</g, `><`);
            data = data.replace(/\s{2,}/g, ` `);
            return data.replace(symbols, encodeURIComponent);
        }
        if (!this.tabletop) {
            throw new Error(`${this.machineName} needs a tabletop before previewing.`);
        }
        if (!geometry.paperGroup || !geometry.filepath) {
            throw new Error('Geometry is not ready: either paperGroup or filepath not set.');
        }
        const headerXmlns = 'xmlns="http://www.w3.org/2000/svg"';
        const headerWidth = `width="${this.tabletop.workEnvelope.width}mm"`;
        const headerHeight = `height="${this.tabletop.workEnvelope.height}mm"`;
        const svgHeader = `<svg ${headerXmlns} ${headerWidth} ${headerHeight}>`;
        const svgFooter = `</svg>`;
        const svgPath = geometry.paperGroup.exportSVG({
            bounds: 'content',
            asString: true,
            precision: 2
        });
        const svgString = svgHeader + svgPath + svgFooter;
        const encodedSvg = urlEncodeSvg(svgString);
        const url = `${BASE_URL}/machine/generateInstructions?svgString=${encodedSvg}`;
        let response = await fetch(url);
        if (response.ok) {
            let resJson = await response.json();
            let instructions = resJson.instructions;
            let tp = new Toolpath(geometry.filepath, instructions);
            return tp;
        }
        else {
            throw new Error('Couldn\'t fetch toolpath instructions.');
        }
    }

    plotToolpathOnTabletop(toolpath: Toolpath, tabletop: Tabletop) {
        let tpGroupCopy = toolpath.vizGroup.clone({
            deep: true,
            insert: false
        });
        tabletop.workEnvelope.applyInverseHomography(tpGroupCopy);
        // TODO: move logic to Machine class
        tabletop.sendPaperItemToMachine(tpGroupCopy);
    }
}

export class VisualizationSpace {
    protected machine: Machine;
    protected scene: THREE.Scene;
    protected camera: THREE.Camera;
    protected controls?: OrbitControls;
    protected threeRenderer?: THREE.Renderer;
    protected envelopeGroup: THREE.Group;
    protected vizGroup: THREE.Group;
    protected renderRequested: boolean;

    constructor(machine: Machine) {
        this.machine = machine;
        this.scene = this.initScene();
        this.envelopeGroup = this.createEnvelopeGroup(machine);
        this.vizGroup = new THREE.Group();
        this.scene.add(this.envelopeGroup);
        this.scene.add(this.vizGroup);
        this.camera = this.initCamera(this.scene, this.envelopeGroup.position, true);
        this.renderRequested = false;
        this.initPostDomLoadLogistics();
        // For debugging
        (window as any).vs = this;
    }

    cloneCamera() {
        return this.camera.clone();
    }

    cloneScene() {
        return this.scene.clone();
    }

    get domElement() {
        if (!this.threeRenderer) { return undefined; }
        return this.threeRenderer.domElement;
    }

    addVizWithName(vizGroup: THREE.Group, interpreterName: string) {
        vizGroup.name = interpreterName;
        this.vizGroup.add(vizGroup);
        this.threeRenderScene();
    }

    getCurrentVizNames() {
        return this.vizGroup.children.map((alsoCalledVizGroup) => {
            return alsoCalledVizGroup.name;
        });
    }

    removeAllViz() {
        // TODO: cast as THREE.Mesh and call dispose on geom and mat
        this.vizGroup.children.forEach((child: THREE.Object3D) => {
            child.remove();
        });
        this.vizGroup.children = [];
        this.threeRenderScene();
    }

    createExampleToolpath() {
        let line = new THREE.LineCurve3(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(100, 100, 40),
        );
        let geom = new THREE.TubeBufferGeometry(line, 64, 1, 64, false);
        let material = new THREE.MeshToonMaterial({
            color: 0xe44242,
            side: THREE.DoubleSide
        });
        let mesh = new THREE.Mesh(geom, material);
        return mesh;
    }

    initPostDomLoadLogistics() {
        this.threeRenderer = this.initThreeRenderer();
        this.controls = this.initControls(this.camera, this.threeRenderer);
        this.threeRenderScene();
        // let animate = () => {
        //     let maxFramerate = 20;
        //     setTimeout(() => {
        //         requestAnimationFrame(animate);
        //     }, 1000 / maxFramerate);
        //     this.threeRenderScene();
        // };
        // animate();
    }

    initScene() {
        let scene = new THREE.Scene();
        scene.background = new THREE.Color(0x23241f);
        let topDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.75);
        let leftDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.50);
        let rightDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.25);
        let ambientLight = new THREE.AmbientLight(0x404040);
        leftDirectionalLight.position.set(-1.0, 0.0, 0.0);
        rightDirectionalLight.position.set(0.0, 0.0, 1.0);
        scene.add(topDirectionalLight);
        scene.add(leftDirectionalLight);
        scene.add(rightDirectionalLight);
        scene.add(ambientLight);
        return scene;
    }

    initCamera(scene: THREE.Scene, centerPoint: THREE.Vector3, isOrtho: boolean) {
        let camera;
        let aspect = window.innerWidth / window.innerHeight;
        let viewSize = 150;
        if (isOrtho) {
            camera = new THREE.OrthographicCamera(-viewSize * aspect,
                viewSize * aspect,
                viewSize, -viewSize, -1000, 10000);
            camera.zoom = 0.95;
            camera.updateProjectionMatrix();
            camera.frustumCulled = false;
            camera.position.set(-500, 500, 500); // I don't know why this works
            camera.lookAt(centerPoint);
        }
        else {
            let fov = 50;
            camera = new THREE.PerspectiveCamera(fov, aspect, 0.01, 30000);
            camera.lookAt(centerPoint);
            camera.position.set(-500, 500, 500);
            camera.updateProjectionMatrix();
        }
        return camera;
    }

    initControls(camera: THREE.Camera, renderer: THREE.Renderer) {
        let controls = new OrbitControls(camera, renderer.domElement);
        controls.rotateSpeed = 1.0;
        controls.zoomSpeed = 0.8;
        // controls.panSpeed = 0.8;
        controls.keyPanSpeed = 0.8;
        controls.addEventListener('change', this.requestRenderScene.bind(this));
        controls.enableDamping = true;
        controls.dampingFactor = 0.5;
        return controls;
    }

    initThreeRenderer() {
        let renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        let maybeDom = document.getElementById('visualization-space');
        if (maybeDom) {
            maybeDom.appendChild(renderer.domElement);
        }
        else {
            throw new Error('bad');
        }
        return renderer;
    }

    requestRenderScene() {
        if (!this.renderRequested) {
            this.renderRequested = true;
            requestAnimationFrame(this.threeRenderScene.bind(this));
        }
    }

    threeRenderScene() {
        // this.controls.update();
        // let deltaSeconds = this.clock.getDelta();
        // this.mixers.forEach((mixer) => {
        //     mixer.update(deltaSeconds);
        // });
        if (!this.controls || !this.threeRenderer) { return; }
        this.renderRequested = false;
        this.controls.update();
        this.threeRenderer.render(this.scene, this.camera);
    }

    createEnvelopeGroup(machine: Machine) : THREE.Group {
        // FIXME: eventually have work envelopes be a 3-vector
        let twoDimWorkEnvelope = machine.workEnvelopeDimensions;
        let height = machine.machineName === 'axidraw' ? 17 : 300;
        let dimensions = {
            width: twoDimWorkEnvelope.x,
            height: height,
            length: twoDimWorkEnvelope.y
        };
        let whitesmoke = 0xf5f5f5;
        let boxGeom = new THREE.BoxBufferGeometry(dimensions.width,
                    dimensions.height, dimensions.length, 2, 2, 2);
        let edgesGeom = new THREE.EdgesGeometry(boxGeom);
        let material = new THREE.LineDashedMaterial({
            color : whitesmoke,
            linewidth: 1,
            scale: 1,
            dashSize: 3,
            gapSize: 3
        });
        let mesh = new THREE.LineSegments(edgesGeom, material);
        mesh.computeLineDistances();
        let envelopeGroup = new THREE.Group();
        envelopeGroup.add(mesh);
        envelopeGroup.position.set(
            dimensions.width / 2,
            dimensions.height / 2,
            dimensions.length / 2
        );
        return envelopeGroup;
    }

    pivotCameraToBirdsEye() {
        // TODO
    }

    computeARScene() {
        // TODO
    }

    toString() : string {
        return `<VS with: ${this.getCurrentVizNames()}>`;
    }
}

export type CamOperationType = 'engrave' | 'pocket' | 'drill';

export class CamOperation {
    operationType: CamOperationType;
    topHeight: number;
    depthHeight: number;
    cutSpeed: number;
    plungeSpeed: number;
    [index: string]: CamOperationType | number;

    static defaultOperation: CamOperation = {
        operationType: 'engrave',
        topHeight: 15,
        depthHeight: 5,
        cutSpeed: 5,
        plungeSpeed: 5
    };

    constructor(incompleteOperation: any) {
        this.operationType = incompleteOperation.operationType
                                || CamOperation.defaultOperation.operationType;
        this.topHeight = incompleteOperation.topHeight
                                || CamOperation.defaultOperation.topHeight;
        this.depthHeight = incompleteOperation.depthHeight
                                || CamOperation.defaultOperation.depthHeight;
        this.cutSpeed = incompleteOperation.cutSpeed
                                || CamOperation.defaultOperation.cutSpeed;
        this.plungeSpeed = incompleteOperation.plungeSpeed
                                || CamOperation.defaultOperation.plungeSpeed;
    };
};

export class Cam {
    protected geometry: Geometry;
    protected operation: CamOperation;
    private svg?: XMLDocument;

    constructor(geometry: Geometry, operation: CamOperation) {
        this.geometry = geometry;
        this.operation = operation;
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
        let numSamples = Math.ceil(path.getTotalLength());
        let sampleDistances = [...Array.from(Array(numSamples * SAMPLE_FACTOR).keys())]
                            .map(pt => pt / SAMPLE_FACTOR);
        let points = sampleDistances.map((sampleDist) => {
            return path.getPointAtLength(sampleDist);
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
