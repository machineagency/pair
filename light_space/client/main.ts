/// <reference path="paper.d.ts" />

interface PairNameable extends paper.Group {
    pairName: string;
    pairType: string;
}

class Tabletop {
    project: paper.Project;
    tool: paper.Tool;
    workEnvelope: WorkEnvelope;
    toolpathCollection: ToolpathCollection;
    activeToolpath: PairNameable;

    constructor() {
        this.project = (paper as any).project;
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
            tolerance: 10
        };
        this.tool.onMouseDown = (event, hitOptions) => {
            // Clear existing selections
            this.project.getItems({ selected: true }).forEach((item) => {
                if (item.pairType !== 'workEnvelope') {
                    item.selected = false;
                };
            });

            // let hitResult = this.project.hitTest(event.point);
            // if (hitResult) {
            //     let item = hitResult.item as PairNameable;
            //     if (item.pairType === 'thumbnail') {
            //         this.loadToolpathToCanvas(item.pairName);
            //     }
            //     else if (item.pairType === 'toolpath') {
            //         item.selected = true
            //     }
            // }

            // Check hit for each preview (box + mini toolpath)
            Object.values(this.toolpathCollection.collectionWithBoxes)
            .forEach((preview) => {
                let hitResult = preview.hitTest(event.point);
                if (hitResult) {
                    this.loadToolpathToCanvas(preview.pairName);
                }
            });
            // Able to manipulate toolpaths
            Object.values(this.toolpathCollection.collection)
            .forEach((toolpath) => {
                let hitResult = toolpath.hitTest(event.point);
                // if (hitResult) {
                if (toolpath.bounds.contains(event.point)) {
                    toolpath.selected = true;
                    this.activeToolpath = toolpath;
                }
            });

        };
        this.tool.onMouseDrag = (event, hitOptions) => {
            if (this.activeToolpath) {
                this.activeToolpath.position = this.activeToolpath.position.add(event.delta);
            }
        };
        this.tool.onMouseUp = (event, hitOptions) => {
            this.activeToolpath = undefined;
        };
        this.tool.onKeyUp = (event, hitOptions) => {
            if (event.key === 'e') {
                this.workEnvelope.path.selected = true;
            }
        };
    }

    loadToolpathToCanvas(toolpathName: String) {
        let group = this.toolpathCollection.collection[toolpathName.toString()];
        group.visible = true;
        let path = group.children[0];
        path.children.forEach((child, idx) => {
            child.strokeColor = new paper.Color('red');
            child.strokeWidth = 2;
        });
        path.position = this.workEnvelope.center;
    }
}

class WorkEnvelope {
    tabletop: Tabletop;
    width: number;
    height: number;
    strokeWidth: number;
    path: paper.Path;

    constructor(tabletop, width, height) {
        this.tabletop = tabletop;
        this.width = width;
        this.height = height;
        this.strokeWidth = 3;
        this.render();
    }

    get anchor() : paper.Point {
        return new paper.Point(this.strokeWidth, this.strokeWidth);
    }

    get center() : paper.Point {
        return new paper.Point(Math.floor(this.width / 2),
                               Math.floor(this.height / 2));
    }

    render() {
        let rect = new paper.Rectangle(this.anchor.x, this.anchor.y,
                                 this.width, this.height);
        let path = new paper.Path.Rectangle(rect);
        path.strokeColor = new paper.Color('red');
        path.strokeWidth = this.strokeWidth;
        this.path = path;
        return path;
    }
}

class Toolpath {
}

class ToolpathCollection {
    tabletop: Tabletop;
    previewSize: paper.Size;
    anchor: paper.Point;
    collection: {[key: string] : PairNameable};
    collectionWithBoxes: {[key: string] : PairNameable};
    toolpathNames: String[];
    marginSize: number;

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
                    item = new paper.Group([item]) as PairNameable;
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
                        child.strokeWidth = 3;
                    });
                    let group = new paper.Group([box, thumbnail]) as PairNameable;
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
    (paper as any).setup('main-canvas');
    this.tabletop = new Tabletop();
};

window.onload = function() {
    (paper as any).install(window);
    main();
}
