/// <reference path="lib/paper.d.ts" />
/// <reference path="lib/perspective-transform.d.ts" />

/** This file contains all primitives in the (expanded) Verso language.
 */

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
const BASE_URL = 'http://localhost:3000';

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
        this.project = (paper as any).project;
        this.tool = new paper.Tool();
        this.toolpaths = [];
        this.workEnvelope = new WorkEnvelope(this,
                                             machine.workEnvelopeDimensions.x,
                                             machine.workEnvelopeDimensions.y);
        this.interactionMode = InteractionMode.defaultState;
        this.moveEntireEnvelope = false;
        this.initMouseHandlers();
        this.vizLayer = new paper.Layer();
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
                        let size = new paper.Size(JSON.parse(sizeString));
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
                    this.setHomographyFromCalibration();
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
                let wePathGroup = new paper.Group([ wePathCopy ]);
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
        this.workEnvelope.sizeLabel.fillColor = new paper.Color('cyan');
    }

    setHomographyFromCalibration() : void {
        this.workEnvelope.path.selected = false;
        this.interactionMode = InteractionMode.defaultState;
        this.workEnvelope.sizeLabel.fillColor = new paper.Color('red');
        let h = this.workEnvelope.calculateHomography();
        this.workEnvelope.homography = h;
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
    path: paper.Path = new paper.Path();
    sizeLabel: paper.PointText;
    originalCornerPoints: paper.Point[];
    homography: Homography;

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
        let rect = new paper.Rectangle(
            this.anchor.x,
            this.anchor.y,
            this.width,
            this.height);
        let path = new paper.Path.Rectangle(rect);
        path.strokeColor = new paper.Color('red');
        path.strokeWidth = this.strokeWidth;
        return path;
    }

    _drawSizeLabel() : paper.PointText {
        let labelOffset = 30;
        let labelAnchor = new paper.Point(
            this.anchor.x,
            this.anchor.y + this.height + labelOffset
        );
        let widthMm = Math.round(this.width * PX_TO_MM);
        let heightMm = Math.round(this.height * PX_TO_MM);
        let sizeLabel = new paper.PointText({
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
        return new paper.Point(this.strokeWidth * MM_TO_PX,
                               this.strokeWidth * MM_TO_PX);
    }

    get center() : paper.Point {
        return new paper.Point(Math.floor(this.width / 2),
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
            if (child instanceof paper.Path) {
                let segPoints: number[][] = child.segments.map(unpackSegment);
                let handlesIn = child.segments.map(unpackHandleIn);
                let handlesOut = child.segments.map(unpackHandleOut);
                let transPts = segPoints.map(transformPt);
                let newSegs = transPts.map((pt, idx) => {
                    let newPt = new paper.Point(pt[0], pt[1]);
                    let hIn = handlesIn[idx];
                    let hOut = handlesOut[idx];
                    // Apparently we don't want to apply the homography to
                    // handles. If we do, we get wildly large handle positions
                    // from moving the upper left corner.
                    let oldHIn = new paper.Point(hIn[0], hIn[1]);
                    let oldHOut = new paper.Point(hOut[0], hOut[1]);
                    return new paper.Segment(newPt, oldHIn, oldHOut);
                });
                child.segments = newSegs;
                child.visible = true;
            }
        });
    }
}

export class Toolpath {
    geometryUrl: string;
    instructions: string[];
    vizGroup: paper.Group;

    constructor(geometryUrl: string, instructions: string[]) {
        this.geometryUrl = geometryUrl;
        this.instructions = instructions;
        this.vizGroup = new paper.Group();
        // TODO: vizGroup should be populated by the toolpath visualizers
        // and then rendered to the tabletop.
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
        this.paperPoint = new paper.Point(x, y);
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
        let rectPath = new paper.Path.Rectangle(from, to);
        let paperGroup = new paper.Group([rectPath]);
        tabletop.workEnvelope.applyHomographyToGroup(paperGroup);
        paperGroup.position.set(this.centroid.paperPoint);
        paperGroup.strokeColor = new paper.Color(0x00ff00);
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
        let coeffs = this.extrinsicTransform?.coeffs.toString() || '';
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

export type GeometryFiletype = 'svg' | 'stl';

export class Geometry {
    tabletop: Tabletop;
    paperGroup?: paper.Group;

    // The name of the file for the geometry in the form <NAME>.<FILETYPE>
    filename?: string;

    // A filepath or URL for retrieving the geometry's file, note that this
    // path does not necessarily contain the filetype.
    filepath?: string;

    constructor(tabletop: Tabletop) {
        this.tabletop = tabletop;
    }

    get position() {
        if (this.paperGroup) {
            return this.paperGroup.position;
        }
    }

    get filetype() : GeometryFiletype | undefined {
        if (this.filepath) {
            let maybePathSegments = this.filename?.split('.');
            if (maybePathSegments && maybePathSegments.length === 2) {
                let maybeFiletype = maybePathSegments[1];
                if (maybeFiletype === 'svg' || maybeFiletype === 'stl') {
                    return maybeFiletype;
                }
            }
        }
    }

    placeAt(placementPoint: Point, tabletop: Tabletop) : Geometry {
        if (!this.paperGroup) {
            throw new Error('Cannot place geometry without data loaded.');
        }
        let adjustedPoint = placementPoint.paperPoint.add(tabletop.workEnvelope.anchor);
        this.paperGroup.position = adjustedPoint;
        return this;
    }

    rotate() {
        // TODO
    }

    scale() {
        // TODO
    }

    async loadFromFilepath(filename: string, filepath: string) : Promise<paper.Group> {
        return new Promise<paper.Group>((resolve) => {
            this.tabletop.project.importSVG(filepath, {
                expandShapes: true,
                insert: false,
                onError: () => {
                    console.warn('Could not load an SVG');
                },
                onLoad: (item: paper.Group, svgString: string) => {
                    this.tabletop.workEnvelope.applyHomographyToGroup(item);
                    item.strokeColor = new paper.Color(0xffffff);
                    item.position = new paper.Point(
                        item.bounds.width * 0.5 + this.tabletop.workEnvelope.anchor.x,
                        item.bounds.height * 0.5 + this.tabletop.workEnvelope.anchor.y
                    );
                    this.paperGroup = item;
                    this.filename = filename;
                    this.filepath = filepath;
                    resolve(item);
                }
            });
        });
    }
}

export class Machine {
    machineName: string;
    tabletop?: Tabletop;

    constructor(machineName: string) {
        this.machineName = machineName;
        // TODO: look up machine name and initialize—fake it for now
    }

    get workEnvelopeDimensions() {
        switch (this.machineName) {
            case 'axidraw':
                return new Point(280, 180);
            case 'othermill':
                return new Point(200, 200);
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
            let wePathGroup = new paper.Group([ wePathCopy ]);
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

    /* DEPRECATED */
    async _fetchPreviewUrl(toolpath: Toolpath) {
        // Credit: https://github.com/yoksel/url-encoder/ .
        const urlEncodeSvg = (data: String) : String => {
            const symbols = /[\r\n%#()<>?[\\\]^`{|}]/g;
            data = data.replace(/"/g, `'`);
            data = data.replace(/>\s{1,}</g, `><`);
            data = data.replace(/\s{2,}/g, ` `);
            return data.replace(symbols, encodeURIComponent);
        }
        if (!this.tabletop) {
            console.error(`${this.machineName} needs a tabletop before previewing.`);
            return;
        }
        const headerXmlns = 'xmlns="http://www.w3.org/2000/svg"';
        const headerWidth = `width="${this.tabletop.workEnvelope.width}mm"`;
        const headerHeight = `height="${this.tabletop.workEnvelope.height}mm"`;
        const svgHeader = `<svg ${headerXmlns} ${headerWidth} ${headerHeight}>`;
        const svgFooter = `</svg>`;
        const visibleGroupCopy = toolpath.vizGroup
                                    .clone({ insert: false, deep: true })
                                    .set({ visible: true });
        const svgPath = visibleGroupCopy.exportSVG({
            bounds: 'content',
            asString: true,
            precision: 2
        });
        const svgString = svgHeader + svgPath + svgFooter;
        const encodedSvg = urlEncodeSvg(svgString);
        const url = `${BASE_URL}/machine/generatePreview?svgString=${encodedSvg}`;
        let response = await fetch(url);
        if (response.ok) {
            let blob = await response.blob();
            let url = URL.createObjectURL(blob);
            return url;
        }
        else {
            console.error('Couldn\'t fetch toolpath preview.');
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

