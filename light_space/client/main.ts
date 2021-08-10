/// <reference path="paper.d.ts" />

interface PairNameable extends paper.Group {
    pairName: string;
}

class Tabletop {
    project: paper.Project;
    tool: paper.Tool;
    workEnvelope: WorkEnvelope;
    toolpathCollection: ToolpathCollection;

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
            tolerance: 5
        };
        this.tool.onMouseDown = (event, hitOptions) => {
            // Clear existing selections
            this.project.getItems({ selected: true }).forEach((item) => {
                item.selected = false;
            });
            // Check hit for each preview (box + mini toolpath)
            Object.values(this.toolpathCollection.collection)
                .forEach((preview) => {
                let hitResult = preview.hitTest(event.point);
                if (hitResult) {
                    this.loadToolpathToCanvas(preview.pairName);
                }
            });
            // TODO: add handler for WE and selectable toolpaths
        };
    }

    loadToolpathToCanvas(toolpathName: String) {
    }
}

class WorkEnvelope {
    tabletop: Tabletop;
    width: number;
    height: number;
    strokeWidth: number;

    constructor(tabletop, width, height) {
        this.tabletop = tabletop;
        this.width = width;
        this.height = height;
        this.strokeWidth = 3;
        this.render();
    }

    get position() {
        return new paper.Point(this.strokeWidth, this.strokeWidth);
    }

    render() {
        let strokeWidth = 3;
        let rect = new paper.Rectangle(this.position.x, this.position.y,
                                 this.width, this.height);
        let path = new paper.Path.Rectangle(rect);
        path.strokeColor = new paper.Color('red');
        path.strokeWidth = 3;
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
            box.fillColor = new paper.Color('black');
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
                    let scaleFactor = Math.min(this.previewSize.width
                        / item.bounds.width, this.previewSize.height
                        / item.bounds.height);
                    item.scale(scaleFactor);
                    item.position = currBoxPt;
                    item.children.forEach((child, idx) => {
                        child.strokeColor = 'red';
                        child.strokeWidth = 1;
                    });
                    let group = new paper.Group([box, item]) as PairNameable;
                    group.pairName = tpName.toString();
                    this.collection[tpName.toString()] = group;
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
