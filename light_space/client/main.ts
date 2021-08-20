/// <reference path="paper.d.ts" />
/// <reference path="perspective-transform.d.ts" />

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

class Tabletop {
    project: paper.Project;
    tool: paper.Tool;
    workEnvelope: WorkEnvelope;
    toolpathCollection: ToolpathCollection;
    interactionMode: InteractionMode;
    activeToolpath?: Toolpath;
    activeEnvelopeSegment?: paper.Segment;
    moveEntireEnvelope: boolean;

    constructor() {
        this.project = (paper as any).project;
        this.tool = new paper.Tool();
        this.workEnvelope = new WorkEnvelope(this, 720, 480);
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
                    this.loadToolpathToCanvas(thumbnail.pairName);
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
                this.workEnvelope.path.selected = !this.workEnvelope.path.selected;
                this.interactionMode = this.workEnvelope.path.selected
                                        ? InteractionMode.adjustEnvelope
                                        : InteractionMode.defaultState;
                if (this.interactionMode === InteractionMode.defaultState) {
                    this.workEnvelope.sizeLabel.fillColor = new paper.Color('red');
                    let h = this.workEnvelope.calculateHomography();
                    Object.values(this.toolpathCollection.collection)
                        .forEach(toolpath => toolpath.applyHomography(h));
                }
                else {
                    this.workEnvelope.sizeLabel.fillColor = new paper.Color('cyan');
                }
            }
            if (event.key === 'backspace') {
                if (this.activeToolpath) {
                    this.removeToolpathFromCanvas(this.activeToolpath.pairName);
                }
            }
        };
    }

    loadToolpathToCanvas(toolpathName: String) {
        let toolpath = this.toolpathCollection.collection[toolpathName.toString()];
        toolpath.visible = true;
        toolpath.position = this.workEnvelope.center;
    }

    removeToolpathFromCanvas(toolpathName: String) {
        let toolpath = this.toolpathCollection.collection[toolpathName.toString()];
        toolpath.visible = false;
    }
}

class WorkEnvelope {
    tabletop: Tabletop;
    width: number;
    height: number;
    strokeWidth: number;
    path: paper.Path = new paper.Path();
    sizeLabel: paper.PointText;
    originalCornerPoints: paper.Point[];

    constructor(tabletop: Tabletop, width: number, height: number) {
        this.tabletop = tabletop;
        this.strokeWidth = 3;
        this.width = width;
        this.height = height;
        this.path = this._drawPath();
        this.sizeLabel = this._drawSizeLabel();
        this.originalCornerPoints = this.getCornerPoints();
    }

    _drawPath() : paper.Path {
        let rect = new paper.Rectangle(this.anchor.x, this.anchor.y,
                                 this.width, this.height);
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
        let sizeLabel = new paper.PointText({
            point: labelAnchor,
            content: `(${this.width}, ${this.height})`,
            fillColor: 'red',
            fontFamily: 'Courier New',
            fontWeight: 'bold',
            fontSize: labelOffset - 5
        });
        return sizeLabel;
    }

    get anchor() : paper.Point {
        return new paper.Point(this.strokeWidth, this.strokeWidth);
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
        this.width = newSize.width;
        this.height = newSize.height;
        this.path.remove();
        this.sizeLabel.remove();
        this.path = this._drawPath();
        this.sizeLabel = this._drawSizeLabel();
        this.originalCornerPoints = this.getCornerPoints();
    }
}

class Toolpath {
    pairName: string;
    _visible: boolean;
    group: paper.Group;
    readonly originalGroup: paper.Group;

    constructor(tpName: string, svgItem: paper.Group, visible: boolean) {
        this.pairName = tpName;
        this.group = svgItem;
        this.group.strokeColor = new paper.Color('red');
        this.group.strokeWidth = 2;
        this.originalGroup = this.group.clone({ insert: true, deep: true });
        this._visible = visible;
        this.group.visible = visible;
        // Original group is never visible
        this.originalGroup.visible = false;
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

    applyHomography(h: Homography) {
        this.reinitializeGroup();
        let unpackSegment = (seg: paper.Segment) => [seg.point.x, seg.point.y];
        let unpackHandleIn = (seg: paper.Segment) => [seg.handleIn.x, seg.handleIn.y];
        let unpackHandleOut = (seg: paper.Segment) => [seg.handleOut.x, seg.handleOut.y];
        let transformPt = (pt: number[]) => h.transform(pt[0], pt[1]);
        this.group.children.forEach((child) => {
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
                    let toolpath = new Toolpath(tpName.toString(), item, false);
                    let thumbnail = new ToolpathThumbnail(currBoxPt, this.previewSize);
                    thumbnail.setToolpath(toolpath);

                    this.collection[tpName.toString()] = toolpath;
                    this.thumbnailCollection[tpName.toString()] = thumbnail;
                }
            });
        });
    }
}

class Camera {
}

const main = () => {
    (paper as any).setup('main-canvas');
    (window as any).tabletop = new Tabletop();
};

window.onload = function() {
    main();
}
