'use strict';

class Tabletop {
    constructor() {
        this.project = paper.project;
        this.workEnvelope = new WorkEnvelope(720, 480);
    }
}

class WorkEnvelope {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.render();
    }

    render() {
        let strokeWidth = 3;
        let rect = new Rectangle(strokeWidth, strokeWidth, this.width, this.height);
        let path = new Path.Rectangle(rect);
        path.strokeColor = 'red';
        path.strokeWidth = 3;
        return path;
    }
}

class Toolpath {
}

class ToolpathCollection {
    static renderAnchor = { x: 25, y: 500 };
    constructor(tabletop) {
        this.tabletop = tabletop;
        tabletop.toolpathCollection = this;
        this.collection = {};
        this.tabletop.project.importSVG('./toolpaths/nadya-sig.svg', {
            expandShapes: true,
            insert: true,
            onError: () => {
                console.warn('Could not load an SVG');
            },
            onLoad: (item, svgString) => {
                console.log(item.children);
                item.children.forEach((child, idx) => {
                    if (idx === 0) {
                        // FIXME: this doesn't stop the bounding rectangle
                        // from rendering
                        child.visible = false;
                    }
                    else {
                        child.strokeColor = 'red';
                        child.strokeWidth = 1;
                    }
                });
            }
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
    let tpc = new ToolpathCollection(tabletop);
    window.tabletop = tabletop;
    // view.draw();
};

window.onload = function() {
    paper.install(window);
    main();
}
