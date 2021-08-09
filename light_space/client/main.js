'use strict';

class Tabletop {
    constructor() {
        this.project = paper.project;
        this.tool = new Tool();
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
                    preview.selected = true;
                    // TODO: load real TP into canvas instead
                }
            });
            // TODO: add handler for WE and selectable toolpaths
        };
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

    get position() {
        return new Point(this.strokeWidth, this.strokeWidth);
    }

    render() {
        let strokeWidth = 3;
        let rect = new Rectangle(this.position.x, this.position.y,
                                 this.width, this.height);
        let path = new Path.Rectangle(rect);
        path.strokeColor = 'red';
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
        this.previewSize = new Size(100, 75);
        this.anchor = new Point(this.tabletop.workEnvelope.width
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
        let origin = new Point(0, 0);
        this.toolpathNames.forEach((tpName, tpIdx) => {
            // TODO: make each box a Paper.Group
            let box = new Path.Rectangle(origin, this.previewSize);
            box.strokeColor = 'red';
            box.strokeWidth = 2;
            let currBoxPt = new Point(this.anchor.x, this.anchor.y + tpIdx
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
                    let group = new Group([box, item]);
                    this.collection[tpName] = group;
                }
            });
        });
    }
}

class Camera {
}

const main = () => {
    // Setup directly from canvas id:
    paper.setup('main-canvas');
    // var path = new Path();
    // path.strokeColor = 'white';
    // var start = new Point(100, 100);
    // path.moveTo(start);
    // path.lineTo(start.add([ 200, -50 ]));

    let tabletop = new Tabletop();
    window.tabletop = tabletop;
    // view.draw();
};

window.onload = function() {
    paper.install(window);
    main();
}
