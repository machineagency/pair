/// <reference path="lib/paper.d.ts" />
/// <reference path="lib/perspective-transform.d.ts" />

/** This file contains all primitives in the (expanded) Pair language.
 */

interface PairNameable extends paper.Group {
    pairName: string;
    pairType: string;
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
                this.activeToolpath.position = this.activeToolpath.position.add(event.delta);
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
                    let tpGroupCopy = this.activeToolpath.group.clone({
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

    clearToolpaths() {
        this.toolpaths.forEach(tp => tp.clearFromTabletop());
        this.toolpaths = [];
    }

    clearTabletopFromCanvas() {
        this.workEnvelope.clearFromTabletop();
        this.clearToolpaths();
        console.log('Tabletop cleared.');
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
    pairName: string;
    _visible: boolean;
    _visualizationMode: boolean;
    group: paper.Group;
    visualizationGroup: paper.Group;
    instructions: string[];
    tabletop: Tabletop;
    readonly originalGroup: paper.Group;

    constructor(tpName: string, svgItem: paper.Group, tabletop: Tabletop) {
        this.pairName = tpName;
        this.tabletop = tabletop;
        this.group = svgItem;
        this.group.strokeColor = new paper.Color('red');
        this.group.strokeWidth = 2;
        this.originalGroup = this.group.clone({ insert: true, deep: true });
        this._visible = false;
        this.group.visible = true;
        // Original group is never visible
        this.originalGroup.visible = false;
        this.tabletop.project.activeLayer.addChild(this.group);
        // Have separate group for visualizing instructions, etc.
        this._visualizationMode = false;
        this.visualizationGroup = new paper.Group();
        this.visualizationGroup.visible = false;
        this.instructions = [];
    }

    /* Wrapper getters, setters, and methods for paper.Group below. */

    get visible() : boolean {
        return this._visible;
    }

    set visible(isVisible: boolean) {
        this.group.visible = isVisible;
        this._visible = isVisible;
    }

    get position() : paper.Point {
        return this.group.position;
    }

    set position(newPos: paper.Point) {
        this.group.position = newPos;
        this.originalGroup.position = newPos;
    }

    get selected() : boolean {
        return this.group.selected;
    }

    set selected(isSelected: boolean) {
        this.group.selected = isSelected;
        this.originalGroup.selected = isSelected;
    }

    get bounds() : paper.Rectangle {
        return this.group.bounds;
    }

    hitTest(pt: paper.Point, options: HitOptions) : paper.HitResult {
        return this.group.hitTest(pt, options);
    }

    /* Methods that are specific to Toolpath follow. */

    clearFromTabletop() {
        let result = this.group.remove();
        if (!result) {
            console.warn(`Could not remove toolpath ${this}`);
        }
    }

    get visualizationMode() : boolean {
        return this._visualizationMode
    }

    set visualizationMode(flag: boolean) {
        this.visualizationGroup.visible = flag;
        this._visualizationMode = flag;
        this.group.visible = !flag;
    }

    /* TODO: add visualization parameters */
    visualizeInstructions(vizGroup: paper.Group) {
        this.visualizationMode = true;
        this.visualizationGroup.children = vizGroup.children;
        // TODO: do this in a more structured way, use TS interface
        // Turns out this is not the right assumption, it seems like
        // the first group is JUST pen down, and the second one is
        // both
        let penDownCPath = this.visualizationGroup.children[1].children[0].children[0] as paper.CompoundPath;
        let penUpCPath = this.visualizationGroup.children[1].children[1].children[0] as paper.CompoundPath;
        penDownCPath.set({
            strokeColor: new paper.Color('red'),
            strokeWidth: 2,
            name: 'move'
        });
        penUpCPath.set({
            strokeColor: new paper.Color('cyan'),
            strokeWidth: 1,
            name: 'travel'
        });
        // this.visualizationGroup = new paper.Group([penDownCPath, penUpCPath]);
        // this.visualizationMode = true;
        this.instructions = this._parseInstructions();
    }

    selectInstructionsWithIndices(indices: number[]) {
        let instPaths = this.visualizationGroup.children.filter((path) : path is paper.Path => {
            return path.className === 'Path';
        });
        instPaths.forEach(path => path.selected = false);
        indices.forEach((instIndex) => {
            instPaths[instIndex].selected = true;
        });
    }

    _parseInstructions() {
        let gatherPaths = (item: paper.Item, ancestorName: string) : paper.Path[] => {
            if (item.className === 'Path') {
                item.name = ancestorName;
                return [item] as paper.Path[];
            }
            let nameToPass = item.name || ancestorName;
            let paths = item.children.map(child => gatherPaths(child, nameToPass)).flat();
            return paths;
        };
        let visGroup = this.visualizationGroup;
        let paths = gatherPaths(visGroup, '');
        let pathToStrings = (path: paper.Path) => {
            let command = path.name;
            let strings = path.segments.map((segment) => {
                return `${command} (${px(segment.point.x)}, ${px(segment.point.y)})`;
            });
            let startSeg = path.firstSegment;
            return strings.concat(`${command} (${px(startSeg.point.x)}, ${px(startSeg.point.y)})`);
        };
        return paths.map(path => pathToStrings(path)).flat();
    }

    reinitializeGroup() {
        let existingGroupVisible = this.group.visible;
        let originalGroupCopy = this.originalGroup.clone({ insert: true, deep: true });
        originalGroupCopy.visible = existingGroupVisible;
        this.group.remove();
        this.group = originalGroupCopy;
    }

    plot() {
        console.log(`Sending ${this.pairName} to machine.`);
    }
}

/**
 * Pair-level point object, one abstraction layer higher than paper.Point.
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

export class Geometry {
    filepath: string;

    constructor(filepath: string) {
        this.filepath = filepath;
    }

    async placeAt(placementPoint: Point, tabletop: Tabletop) : Promise<Toolpath> {
        return new Promise<Toolpath>((resolve) => {
            tabletop.project.importSVG(this.filepath, {
                expandShapes: true,
                insert: false,
                onError: () => {
                    console.warn('Could not load an SVG');
                },
                onLoad: (item: paper.Group, svgString: string) => {
                    tabletop.workEnvelope.applyHomographyToGroup(item);
                    item.strokeColor = new paper.Color(0xffffff);
                    item.position = placementPoint.paperPoint;

                    let tp = new Toolpath(this.filepath, item, tabletop);
                    resolve(tp);
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
        const visibleGroupCopy = toolpath.group
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

    async previewToolpath(toolpath: Toolpath) {
        toolpath.instructions = [];
        toolpath.visualizationGroup.children = [];
        let previewSvgUrl = await this._fetchPreviewUrl(toolpath);
        return new Promise<Toolpath>((resolve, reject) => {
            if (!this.tabletop) {
                console.error(`${this.machineName} needs a tabletop before previewing.`);
                return;
            }
            if (!previewSvgUrl) {
                return;
            }
            console.log(previewSvgUrl);
            this.tabletop.project.importSVG(previewSvgUrl, {
                expandShapes: true,
                insert: false,
                onError: () => {
                    console.warn('Could not load an SVG');
                },
                onLoad: (vizGroup: paper.Group, svgString: string) => {
                    if (!this.tabletop) { return; }
                    // let upAndDownPaths = new paper.Group(vizGroup.children[1]);
                    // toolpath.visualizeInstructions(upAndDownPaths);
                    toolpath.visualizeInstructions(vizGroup);
                    resolve(toolpath);
                }
            });
        });
    }

    plotToolpathOnTabletop(toolpath: Toolpath, tabletop: Tabletop) {
        let tpGroupCopy = toolpath.group.clone({
            deep: true,
            insert: false
        });
        tabletop.workEnvelope.applyInverseHomography(tpGroupCopy);
        // TODO: move logic to Machine class
        tabletop.sendPaperItemToMachine(tpGroupCopy);
    }
}

