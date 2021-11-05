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

export class Tabletop {
    machine: Machine;
    project: paper.Project;
    tool: paper.Tool;
    workEnvelope: WorkEnvelope;
    toolpathCollection: ToolpathCollection;
    interactionMode: InteractionMode;
    activeToolpath?: Toolpath;
    activeEnvelopeSegment?: paper.Segment;
    moveEntireEnvelope: boolean;

    constructor(machine: Machine) {
        this.machine = machine;
        this.project = (paper as any).project;
        this.tool = new paper.Tool();
        this.workEnvelope = new WorkEnvelope(this,
                                             machine.workEnvelopeDimensions.x,
                                             machine.workEnvelopeDimensions.y);
        this.toolpathCollection = new ToolpathCollection(this);
        this.interactionMode = InteractionMode.defaultState;
        this.moveEntireEnvelope = false;
        this.initMouseHandlers();
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
                        Object.values(this.toolpathCollection.collection)
                            .forEach(tp => tp.reinitializeGroup());
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
            // Check hit for each preview (box + mini toolpath)
            Object.values(this.toolpathCollection.thumbnailCollection)
            .forEach((thumbnail) => {
                let hitResult = thumbnail.hitTest(event.point, hitOptions);
                if (hitResult) {
                    this.loadToolpathByName(thumbnail.pairName);
                }
            });
            // Able to manipulate toolpaths
            Object.values(this.toolpathCollection.collection)
            .forEach((toolpath) => {
                let hitResult = toolpath.hitTest(event.point, hitOptions);
                // if (hitResult) {
                if (toolpath.bounds.contains(event.point)) {
                    toolpath.selected = true;
                    this.activeToolpath = toolpath;
                }
                else {
                    toolpath.selected = false;
                }
            });

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
            if (event.key === 'backspace') {
                if (this.activeToolpath) {
                    this.removeToolpathFromCanvas(this.activeToolpath.pairName);
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
        toolpath.visible = true;
    }

    loadToolpathByName(toolpathName: String) {
        let toolpath = this.toolpathCollection.collection[toolpathName.toString()];
        toolpath.visible = true;
        toolpath.position = this.workEnvelope.center;
    }

    removeToolpathFromCanvas(toolpathName: String) {
        let toolpath = this.toolpathCollection.collection[toolpathName.toString()];
        toolpath.visible = false;
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
    group: paper.Group;
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

class ToolpathThumbnail extends paper.Group {
    toolpath?: Toolpath;
    anchor: paper.Point;
    size: paper.Size;
    pairName: string;

    constructor(anchor: paper.Point, size: paper.Size) {
        let box = new paper.Path.Rectangle(anchor, size);
        box.strokeColor = new paper.Color('red');
        box.strokeWidth = 2;
        box.fillColor = new paper.Color('red');
        super([box]);
        this.anchor = anchor;
        this.size = size;
        this.pairName = '';
    }

    setToolpath(toolpath: Toolpath) {
        let thumbnailTp = toolpath.group.clone();
        thumbnailTp.visible = true;
        let scaleFactor = Math.min(this.size.width
            / thumbnailTp.bounds.width, this.size.height
            / thumbnailTp.bounds.height);
        thumbnailTp.scale(scaleFactor);
        let position = new paper.Point(
            this.anchor.x + 0.5 * this.size.width,
            this.anchor.y + 0.5 * this.size.height
        );
        thumbnailTp.position = position;
        thumbnailTp.children.forEach((child, idx) => {
            child.strokeColor = new paper.Color('black');
            child.strokeWidth = 3;
        });
        this.toolpath = toolpath;
        this.pairName = toolpath.pairName.toString();
        this.addChild(thumbnailTp)
    }
}

class ToolpathCollection {
    tabletop: Tabletop;
    previewSize: paper.Size;
    anchor: paper.Point;
    collection: {[key: string] : Toolpath};
    thumbnailCollection: {[key: string] : ToolpathThumbnail};
    toolpathNames: String[];
    marginSize: number;

    constructor(tabletop: Tabletop) {
        this.tabletop = tabletop;
        tabletop.toolpathCollection = this;
        this.previewSize = new paper.Size(100, 75);
        this.anchor = new paper.Point(this.tabletop.workEnvelope.width
            + this.previewSize.width / 2 + this.tabletop.workEnvelope.strokeWidth
            + 20, this.previewSize.height / 2
            + this.tabletop.workEnvelope.strokeWidth);
        this.collection = {};
        this.thumbnailCollection = {};
        // TODO: eventually load this from the server
        this.toolpathNames = [
            'nadya-sig', 'box', 'wave'
        ];
        this.marginSize = 10;
        this.initCollection();
    }

    initCollection() {
        let origin = new paper.Point(0, 0);
        this.toolpathNames.forEach((tpName, tpIdx) => {
            let currBoxPt = new paper.Point(this.anchor.x, this.anchor.y + tpIdx
                    * (this.previewSize.height + this.marginSize));

            this.tabletop.project.importSVG(`./toolpaths/${tpName}.svg`, {
                expandShapes: true,
                insert: true,
                onError: () => {
                    console.warn('Could not load an SVG');
                },
                onLoad: (item: paper.Group, svgString: string) => {
                    let toolpath = new Toolpath(tpName.toString(), item, this.tabletop);
                    let thumbnail = new ToolpathThumbnail(currBoxPt, this.previewSize);
                    thumbnail.setToolpath(toolpath);

                    this.collection[tpName.toString()] = toolpath;
                    this.thumbnailCollection[tpName.toString()] = thumbnail;
                }
            });
        });
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

    toString() {
        return `(${this.x}, ${this.y})`;
    }
}

export class Region {
    name: string;
    corners: Point[];
    _paperObj?: paper.Path;

    constructor(name: string, corners: Point[]) {
        this.name = name;
        this.corners = corners;
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
        rectPath.strokeColor = new paper.Color(0x00ff00);
        rectPath.strokeWidth = 1;
        tabletop.project.activeLayer.addChild(rectPath);
        this._paperObj = rectPath;
    }

    clearFromTabletop() {
        if (this._paperObj) {
            this._paperObj.remove();
        }
    }

    toString() {
        return this.corners.map(c => c.toString()).toString();
    }
}

export class Camera {
    // TODO: camera calibration to machine space with fiducial
    tabletop?: Tabletop;

    constructor(tabletop?: Tabletop) {
        this.tabletop = tabletop;
    }

    async takePhoto() : Promise<string> {
        let imageRes = await fetch('/camera/takePhoto');
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
            x: number,
            y: number,
            width: number,
            height: number
        };
        const url = '/image/detectFaceBoxes';
        let response = await fetch(url);
        let regions : Region[];
        if (response.ok) {
            let resJson = await response.json();
            regions = resJson.results.map((obj: BoxResponseObj, idx: number) => {
                let tl = new Point(obj.x - 0.5 * obj.width, obj.y - 0.5 * obj.height);
                let bl = new Point(obj.x - 0.5 * obj.width, obj.y + 0.5 * obj.height);
                let tr = new Point(obj.x + 0.5 * obj.width, obj.y - 0.5 * obj.height);
                let br = new Point(obj.x + 0.5 * obj.width, obj.y + 0.5 * obj.height);
                let region = new Region(`face ${idx}`, [tl, bl, tr, br]);
                if (this.tabletop) {
                    region.drawOnTabletop(this.tabletop);
                }
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
        // TODO
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

