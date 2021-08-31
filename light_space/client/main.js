"use strict";
/// <reference path="paper.d.ts" />
/// <reference path="perspective-transform.d.ts" />
var InteractionMode;
(function (InteractionMode) {
    InteractionMode[InteractionMode["defaultState"] = 0] = "defaultState";
    InteractionMode[InteractionMode["adjustEnvelope"] = 1] = "adjustEnvelope";
})(InteractionMode || (InteractionMode = {}));
const MM_TO_PX = 3.7795275591;
const PX_TO_MM = 0.2645833333;
const BASE_URL = 'http://localhost:3000';
class Tabletop {
    constructor() {
        this.project = paper.project;
        this.tool = new paper.Tool();
        this.workEnvelope = new WorkEnvelope(this, 280, 180);
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
        this.tool.onMouseDown = (event, hitOptions) => {
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
        this.tool.onMouseDrag = (event, hitOptions) => {
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
        this.tool.onMouseUp = (event, hitOptions) => {
            this.moveEntireEnvelope = false;
        };
        this.tool.onKeyUp = (event, hitOptions) => {
            if (event.key === 'e') {
                this.workEnvelope.path.selected = !this.workEnvelope.path.selected;
                this.interactionMode = this.workEnvelope.path.selected
                    ? InteractionMode.adjustEnvelope
                    : InteractionMode.defaultState;
                if (this.interactionMode === InteractionMode.defaultState) {
                    this.workEnvelope.sizeLabel.fillColor = new paper.Color('red');
                    let h = this.workEnvelope.calculateHomography();
                    this.workEnvelope.homography = h;
                }
                else {
                    this.workEnvelope.sizeLabel.fillColor = new paper.Color('cyan');
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
                let wePathGroup = new paper.Group([wePathCopy]);
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
    loadToolpathToCanvas(toolpathName) {
        let toolpath = this.toolpathCollection.collection[toolpathName.toString()];
        toolpath.visible = true;
        toolpath.position = this.workEnvelope.center;
    }
    removeToolpathFromCanvas(toolpathName) {
        let toolpath = this.toolpathCollection.collection[toolpathName.toString()];
        toolpath.visible = false;
    }
    sendPaperItemToMachine(itemToSend) {
        // TODO: generify
        // Credit: https://github.com/yoksel/url-encoder/ .
        const urlEncodeSvg = (data) => {
            const symbols = /[\r\n%#()<>?[\\\]^`{|}]/g;
            // Use single quotes instead of double to avoid encoding.
            let externalQuotesValue = 'double';
            if (externalQuotesValue === `double`) {
                data = data.replace(/"/g, `'`);
            }
            else {
                data = data.replace(/'/g, `"`);
            }
            data = data.replace(/>\s{1,}</g, `><`);
            data = data.replace(/\s{2,}/g, ` `);
            // Using encodeURIComponent() as replacement function
            // allows to keep result code readable
            return data.replace(symbols, encodeURIComponent);
        };
        const headerXmlns = 'xmlns="http://www.w3.org/2000/svg"';
        const headerWidth = `width="300mm"`;
        const headerHeight = `height="300mm"`;
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
class WorkEnvelope {
    constructor(tabletop, width, height) {
        this.path = new paper.Path();
        this.tabletop = tabletop;
        this.strokeWidth = 3;
        this.width = width * MM_TO_PX;
        this.height = height * MM_TO_PX;
        this.path = this._drawPath();
        this.sizeLabel = this._drawSizeLabel();
        this.originalCornerPoints = this.getCornerPoints();
        this.homography = this.calculateHomography();
    }
    _drawPath() {
        let rect = new paper.Rectangle(this.anchor.x, this.anchor.y, this.width, this.height);
        let path = new paper.Path.Rectangle(rect);
        path.strokeColor = new paper.Color('red');
        path.strokeWidth = this.strokeWidth;
        return path;
    }
    _drawSizeLabel() {
        let labelOffset = 30;
        let labelAnchor = new paper.Point(this.anchor.x, this.anchor.y + this.height + labelOffset);
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
    get anchor() {
        return new paper.Point(this.strokeWidth * MM_TO_PX, this.strokeWidth * MM_TO_PX);
    }
    get center() {
        return new paper.Point(Math.floor(this.width / 2), Math.floor(this.height / 2));
    }
    getCornerPoints() {
        return this.path.segments.map(segment => segment.point.clone());
    }
    calculateHomography() {
        let unpackPoint = (pt) => [pt.x, pt.y];
        let srcFlat = this.originalCornerPoints.map(unpackPoint).flat();
        let dstFlat = this.getCornerPoints().map(unpackPoint).flat();
        let h = PerspT(srcFlat, dstFlat);
        return h;
    }
    redrawForSize(newSize) {
        this.width = newSize.width * MM_TO_PX;
        this.height = newSize.height * MM_TO_PX;
        this.path.remove();
        this.sizeLabel.remove();
        this.path = this._drawPath();
        this.sizeLabel = this._drawSizeLabel();
        this.originalCornerPoints = this.getCornerPoints();
    }
    applyHomographyToGroup(g) {
        let h = this.homography;
        let boundTransformMethod = h.transform.bind(h);
        this._pointwisePathTransform(g, boundTransformMethod);
    }
    applyInverseHomography(g) {
        let h = this.homography;
        let boundTransformMethod = h.transformInverse.bind(h);
        this._pointwisePathTransform(g, boundTransformMethod);
    }
    _pointwisePathTransform(groupToTransform, transform) {
        let unpackSegment = (seg) => [seg.point.x, seg.point.y];
        let unpackHandleIn = (seg) => [seg.handleIn.x, seg.handleIn.y];
        let unpackHandleOut = (seg) => [seg.handleOut.x, seg.handleOut.y];
        let transformPt = (pt) => transform(pt[0], pt[1]);
        groupToTransform.children.forEach((child) => {
            if (child instanceof paper.Path) {
                let segPoints = child.segments.map(unpackSegment);
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
class Toolpath {
    constructor(tpName, svgItem, tabletop) {
        this.pairName = tpName;
        this.tabletop = tabletop;
        this.group = svgItem;
        this.group.strokeColor = new paper.Color('red');
        this.group.strokeWidth = 2;
        this.originalGroup = this.group.clone({ insert: true, deep: true });
        this._visible = false;
        this.group.visible = false;
        // Original group is never visible
        this.originalGroup.visible = false;
    }
    /* Wrapper getters, setters, and methods for paper.Group below. */
    get visible() {
        return this._visible;
    }
    set visible(isVisible) {
        this.group.visible = isVisible;
        this._visible = isVisible;
    }
    get position() {
        return this.group.position;
    }
    set position(newPos) {
        this.group.position = newPos;
        this.originalGroup.position = newPos;
    }
    get selected() {
        return this.group.selected;
    }
    set selected(isSelected) {
        this.group.selected = isSelected;
        this.originalGroup.selected = isSelected;
    }
    get bounds() {
        return this.group.bounds;
    }
    hitTest(pt, options) {
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
}
class ToolpathThumbnail extends paper.Group {
    constructor(anchor, size) {
        let box = new paper.Path.Rectangle(anchor, size);
        box.strokeColor = new paper.Color('red');
        box.strokeWidth = 2;
        box.fillColor = new paper.Color('red');
        super([box]);
        this.anchor = anchor;
        this.size = size;
        this.pairName = '';
    }
    setToolpath(toolpath) {
        let thumbnailTp = toolpath.group.clone();
        thumbnailTp.visible = true;
        let scaleFactor = Math.min(this.size.width
            / thumbnailTp.bounds.width, this.size.height
            / thumbnailTp.bounds.height);
        thumbnailTp.scale(scaleFactor);
        let position = new paper.Point(this.anchor.x + 0.5 * this.size.width, this.anchor.y + 0.5 * this.size.height);
        thumbnailTp.position = position;
        thumbnailTp.children.forEach((child, idx) => {
            child.strokeColor = new paper.Color('black');
            child.strokeWidth = 3;
        });
        this.toolpath = toolpath;
        this.pairName = toolpath.pairName.toString();
        this.addChild(thumbnailTp);
    }
}
class ToolpathCollection {
    constructor(tabletop) {
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
                onLoad: (item, svgString) => {
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
class Camera {
}
const main = () => {
    paper.setup('main-canvas');
    window.tabletop = new Tabletop();
};
window.onload = function () {
    main();
};
//# sourceMappingURL=main.js.map