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
    activeToolpath: Toolpath;

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
            this.project.getItems({ selected: true }).forEach((toolpath) => {
                toolpath.selected = false;
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
        let toolpath = this.toolpathCollection.collection[toolpathName.toString()];
        toolpath.visible = true;
        toolpath.position = this.workEnvelope.center;
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

class Toolpath extends paper.Group {
    pairName: string;

    constructor(tpName, svgItem, visible) {
        super(svgItem);
        this.pairName = tpName;
        this.children.forEach((child, idx) => {
            child.strokeColor = new paper.Color('red');
            child.strokeWidth = 2;
        });
        this.visible = visible;
    }
}

class ToolpathThumbnail extends paper.Group{
    toolpath: Toolpath;
    anchor: paper.Point;
    size: paper.Size;
    pairName: string;

    constructor(anchor, size) {
        let box = new paper.Path.Rectangle(anchor, size);
        box.strokeColor = new paper.Color('red');
        box.strokeWidth = 2;
        box.fillColor = new paper.Color('red');
        super([box]);
        this.anchor = anchor;
        this.size = size;
    }

    setToolpath(toolpath) {
        let thumbnailTp = toolpath.clone();
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
            child.strokeColor = 'black';
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
                    let toolpath = new Toolpath(tpName, item, false);
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
    this.tabletop = new Tabletop();
};

window.onload = function() {
    (paper as any).install(window);
    main();
}
