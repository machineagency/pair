/// <reference path="paper.d.ts" />
class Tabletop {
    constructor() {
        this.project = paper.project;
        this.tool = new paper.Tool();
        this.workEnvelope = new WorkEnvelope(this, 720, 480);
        this.toolpathCollection = new ToolpathCollection(this);
        this.initMouseHandlers();
    }
    initMouseHandlers() {
        const hitOptions = {
            segments: true,
            stroke: true,
            fill: true,
            tolerance: 5
        };
        this.tool.onMouseDown = (event, hitOptions) => {
            // Clear existing selections
            this.project.getItems({ selected: true }).forEach((item) => {
                item.selected = false;
            });
            // Check hit for each preview (box + mini toolpath)
            Object.values(this.toolpathCollection.collectionWithBoxes)
                .forEach((preview) => {
                let hitResult = preview.hitTest(event.point);
                if (hitResult) {
                    this.loadToolpathToCanvas(preview.pairName);
                }
            });
            // TODO: add handler for WE and selectable toolpaths
        };
    }
    loadToolpathToCanvas(toolpathName) {
        let path = this.toolpathCollection.collection[toolpathName.toString()];
        path.visible = true;
        path.children.forEach((child, idx) => {
            child.strokeColor = new paper.Color('red');
            child.strokeWidth = 1;
        });
        path.position = this.workEnvelope.center;
    }
}
class WorkEnvelope {
    constructor(tabletop, width, height) {
        this.tabletop = tabletop;
        this.width = width;
        this.height = height;
        this.strokeWidth = 3;
        this.render();
    }
    get anchor() {
        return new paper.Point(this.strokeWidth, this.strokeWidth);
    }
    get center() {
        return new paper.Point(Math.floor(this.width / 2), Math.floor(this.height / 2));
    }
    render() {
        let strokeWidth = 3;
        let rect = new paper.Rectangle(this.anchor.x, this.anchor.y, this.width, this.height);
        let path = new paper.Path.Rectangle(rect);
        path.strokeColor = new paper.Color('red');
        path.strokeWidth = 3;
        return path;
    }
}
class Toolpath {
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
        this.collectionWithBoxes = {};
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
            // TODO: make each box a Paper.Group
            let box = new paper.Path.Rectangle(origin, this.previewSize);
            box.strokeColor = new paper.Color('red');
            box.strokeWidth = 2;
            box.fillColor = new paper.Color('red');
            let currBoxPt = new paper.Point(this.anchor.x, this.anchor.y + tpIdx
                * (this.previewSize.height + this.marginSize));
            box.position = currBoxPt;
            this.tabletop.project.importSVG(`./toolpaths/${tpName}.svg`, {
                expandShapes: true,
                insert: true,
                onError: () => {
                    console.warn('Could not load an SVG');
                },
                onLoad: (item, svgString) => {
                    this.collection[tpName.toString()] = item;
                    let thumbnail = item.clone();
                    item.visible = false;
                    let scaleFactor = Math.min(this.previewSize.width
                        / item.bounds.width, this.previewSize.height
                        / item.bounds.height);
                    thumbnail.scale(scaleFactor);
                    thumbnail.position = currBoxPt;
                    thumbnail.children.forEach((child, idx) => {
                        child.strokeColor = 'black';
                        child.strokeWidth = 1;
                    });
                    let group = new paper.Group([box, thumbnail]);
                    group.pairName = tpName.toString();
                    this.collectionWithBoxes[tpName.toString()] = group;
                }
            });
        });
    }
}
class Camera {
}
const main = () => {
    paper.setup('main-canvas');
    this.tabletop = new Tabletop();
};
window.onload = function () {
    paper.install(window);
    main();
};
//# sourceMappingURL=main.js.map