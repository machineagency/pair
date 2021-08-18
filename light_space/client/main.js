"use strict";
/// <reference path="paper.d.ts" />
/// <reference path="perspective-transform.d.ts" />
var InteractionMode;
(function (InteractionMode) {
    InteractionMode[InteractionMode["defaultState"] = 0] = "defaultState";
    InteractionMode[InteractionMode["adjustEnvelope"] = 1] = "adjustEnvelope";
})(InteractionMode || (InteractionMode = {}));
class Tabletop {
    constructor() {
        this.project = paper.project;
        this.tool = new paper.Tool();
        this.workEnvelope = new WorkEnvelope(this, 720, 480);
        this.toolpathCollection = new ToolpathCollection(this);
        this.interactionMode = InteractionMode.defaultState;
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
            if (this.interactionMode === InteractionMode.adjustEnvelope) {
                let hitSegmentOptions = {
                    segments: true,
                    tolerance: 15
                };
                let hitResult = this.workEnvelope.path.hitTest(event.point, hitSegmentOptions);
                if (hitResult) {
                    this.activeEnvelopeSegment = hitResult.segment;
                }
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
            if (this.interactionMode === InteractionMode.adjustEnvelope
                && this.activeEnvelopeSegment) {
                this.activeEnvelopeSegment.point = this.activeEnvelopeSegment
                    .point.add(event.delta);
            }
        };
        this.tool.onMouseUp = (event, hitOptions) => {
            // Nothing here yet...
        };
        this.tool.onKeyUp = (event, hitOptions) => {
            if (event.key === 'e') {
                this.workEnvelope.path.selected = !this.workEnvelope.path.selected;
                this.interactionMode = this.workEnvelope.path.selected
                    ? InteractionMode.adjustEnvelope
                    : InteractionMode.defaultState;
                if (this.interactionMode === InteractionMode.defaultState) {
                    let h = this.workEnvelope.calculateHomography();
                    this.workEnvelope.homography = h;
                    Object.values(this.toolpathCollection.collection)
                        .forEach(toolpath => toolpath.applyHomography(h));
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
}
class WorkEnvelope {
    constructor(tabletop, width, height) {
        this.path = new paper.Path();
        this.tabletop = tabletop;
        this.width = width;
        this.height = height;
        this.strokeWidth = 3;
        let rect = new paper.Rectangle(this.anchor.x, this.anchor.y, this.width, this.height);
        let path = new paper.Path.Rectangle(rect);
        path.strokeColor = new paper.Color('red');
        path.strokeWidth = this.strokeWidth;
        this.path = path;
        this.originalCornerPoints = this.getCornerPoints();
        this.homography = this.calculateHomography();
    }
    get anchor() {
        return new paper.Point(this.strokeWidth, this.strokeWidth);
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
}
class Toolpath {
    constructor(tpName, svgItem, visible) {
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
        originalGroupCopy.strokeColor = new paper.Color('blue');
        // this.group.replaceWith(originalGroupCopy);
        this.group.remove();
        this.group = originalGroupCopy;
    }
    applyHomography(h) {
        this.reinitializeGroup();
        let unpackSegment = (seg) => [seg.point.x, seg.point.y];
        let unpackHandleIn = (seg) => [seg.handleIn.x, seg.handleIn.y];
        let unpackHandleOut = (seg) => [seg.handleOut.x, seg.handleOut.y];
        let transformPt = (pt) => h.transform(pt[0], pt[1]);
        // FIXME: works with just children, but of course the math will be
        // wrong since the homograpy maps from the original square to what we
        // have now. So need to investigate what's going wrong with calculating
        // original points and showing them.
        this.group.children.forEach((child) => {
            if (child instanceof paper.Path) {
                let segPoints = child.segments.map(unpackSegment);
                let handlesIn = child.segments.map(unpackHandleIn);
                let handlesOut = child.segments.map(unpackHandleOut);
                let transPts = segPoints.map(transformPt);
                let transHIn = handlesIn.map(transformPt);
                let transHOut = handlesOut.map(transformPt);
                let newSegs = transPts.map((pt, idx) => {
                    let newPt = new paper.Point(pt[0], pt[1]);
                    let hIn = transHIn[idx];
                    let hOut = transHOut[idx];
                    let newHIn = new paper.Point(hIn[0], hIn[1]);
                    let newHOut = new paper.Point(hOut[0], hOut[1]);
                    return new paper.Segment(newPt, newHIn, newHOut);
                });
                child.segments = newSegs;
                child.visible = true;
            }
        });
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
    paper.setup('main-canvas');
    window.tabletop = new Tabletop();
};
window.onload = function () {
    main();
};
//# sourceMappingURL=main.js.map