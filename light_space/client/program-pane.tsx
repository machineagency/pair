/** This file contains React components for:
 *  - The program pane
 *  - All livelit windows and functionality as described in the Omar et al.
 *    paper.
 */

import * as pair from './pair.js';

interface Props {};
interface ProgramLineProps {
    lineNumber: number;
    lineText: string;
    immediateEval: boolean;
    highlight: boolean;
};
interface TabletopCalibratorProps {
    machine: pair.Machine;
    tabletop: pair.Tabletop;
};
interface FaceFinderProps {
    camera: pair.Camera;
}

interface State {};
interface ProgramPaneState {
    showLivelitWindow: boolean;
    activeLine: number;
};
interface ProgramLineState {
    lineText: string;
    expandedLineText: string;
};
interface FaceFinderState {
    imagePath: string;
    detectedRegions: pair.Region[];
}

class ProgramPane extends React.Component<Props, ProgramPaneState> {
    defaultLinesSignature = [
        'let signature = $geometryGallery;',
        'let point = $pointPicker;',
        'let toolpath = signature.placeAt(point);',
        '// $toolpathTransformer signature',
        '// $machineSynthesizer gigapan coinGeometry',
        'machine.plot(toolpath);'
    ];

    defaultLinesMustacheExpanded = [
        'let machine = new pair.Machine(\'axidraw\');',
        '(() => {})(); // TODO: run calibration, no-op for now',
        'let mustache = new pair.Geometry(\'./toolpaths/mustache.svg\')',
        'let faceBoundingPolygons = [] // TODO: initialize array values',
        'let faceCenters = faceBoundingPolygons.map(poly => poly.center);',
        'let toolpaths = faceCenters.map(c => mustache.placeAt(c));',
        'toolpaths.forEach(toolpath => machine.plot(toolpath))'
    ];

    defaultLinesMustacheLiveLits = [
        'let machine = new pair.Machine(\'axidraw\');',
        '$tabletopCalibrator(tabletop, machine);',
        'let mustache = $geometryGallery;',
        'let faceBoundingPolygons = $faceFinder;',
        'let faceCenters = faceBoundingPolygons.map(poly => poly.center);',
        'let toolpaths = faceCenters.map(c => mustache.placeAt(c));',
        'toolpaths.forEach(toolpath => machine.plot(toolpath))'
    ];

    constructor(props: Props) {
        super(props);
        this.state = {
            showLivelitWindow: true,
            activeLine: 0
        };
    }

    parseTextForLivelit(text: string) : JSX.Element {
        const re = /\$\w+/;
        const maybeMatch = text.match(re);
        const defaultEl = <div></div>;
        if (!maybeMatch) {
            return <div></div>
        }
        const livelitName = maybeMatch[0].slice(1);
        switch (livelitName) {
            case 'geometryGallery':
                return <GeometryGallery></GeometryGallery>
            case 'pointPicker':
                return <PointPicker></PointPicker>
            case 'tabletopCalibrator':
                return <TabletopCalibrator></TabletopCalibrator>
            case 'faceFinder':
                return <FaceFinder></FaceFinder>
            default:
                return defaultEl;
        }
    }

    renderTextLines(textLines: string[]) {
        const lines = textLines.map((line, index) => {
            const lineNumber = index + 1;
            const immediateEval = lineNumber === this.state.activeLine - 1;
            const highlight = lineNumber === this.state.activeLine;
            // TODO: for now naively expand all livelits, next step is
            // to add on click functionality
            if (false) {
            // if (lineNumber === this.state.livelitLineNumber) {
                const livelitWindow = this.parseTextForLivelit(line);
                return [
                    <ProgramLine lineNumber={lineNumber}
                                 immediateEval={immediateEval}
                                 highlight={highlight}
                                 key={index}
                                 lineText={line}></ProgramLine>,
                    livelitWindow
                ]
            }
            return <ProgramLine lineNumber={lineNumber}
                                immediateEval={immediateEval}
                                highlight={highlight}
                                key={index}
                                lineText={line}></ProgramLine>
        }).flat();
        return lines;
    }

    stepLine() {
        this.setState((prevState) => {
            return {
                showLivelitWindow: true,
                activeLine: prevState.activeLine + 1
            }
        });
    }

    resetLine() {
    }

    render() {
        return [
            <div className="program-lines">
                { this.renderTextLines(this.defaultLinesMustacheExpanded) }
            </div>,
            <div className="program-controls">
                <div className="pc-btn pc-step"
                     onClick={this.stepLine.bind(this)}>Run</div>
                <div className="pc-btn pc-reset"
                     onClick={this.resetLine.bind(this)}>Reset</div>
            </div>
        ];
    }
}

class ProgramLine extends React.Component<ProgramLineProps, ProgramLineState> {

    colorSetLivelit = 0x888888;

    constructor(props: ProgramLineProps) {
        super(props);
        this.state = {
            lineText: props.lineText,
            expandedLineText: ''
        };
    }

    hasLivelitExpansion() {
        return this.state.expandedLineText !== '';
    }

    expandLivelit(lineText: string) : void {
        this.setState((prevState) => {
        // TODO: actually expand
            let newState: ProgramLineState = {
                lineText: prevState.lineText,
                expandedLineText: prevState.lineText
            };
            return newState;
        })
    }

    evalLine() {
        if (this.hasLivelitExpansion()) {
            // TODO: prompt the user to enter splices if we are unable to
            // do the expansion as is. For now, just print an error if
            // we try to eval and unexpanded livelit.
            console.error('I can\'t yet evaluate unexpanded livelits. Skipping this line for now.');
        }
        else {
            eval(this.state.lineText);
        };
    }

    render() {
        const highlightClass = this.props.highlight ? 'pl-highlight' : '';
        const lineNumber = this.props.lineNumber || 0;
        // FIXME: this is messy side effect
        if (this.props.immediateEval) {
            this.evalLine();
        }
        return <div className={`program-line ${highlightClass}`}
                    id={`line-${lineNumber - 1}`}>
                    {this.state.lineText}
               </div>
    }
}

class LivelitWindow extends React.Component<Props, State> {
    titleText: string;
    livelitClassName: string;
    titleKey: number;
    contentKey: number;

    constructor(props: Props) {
        super(props);
        this.titleText = 'Livelit Window';
        this.livelitClassName = 'livelit-window';
        this.titleKey = 0;
        this.contentKey = 1;
    }

    renderTitle() {
        return <div className="title"
                    key={this.titleKey.toString()}>
                    {this.titleText}
               </div>;
    }

    renderContent() {
        return <div className="content"
                    key={this.contentKey.toString()}>
               </div>;
    }

    render() {
        return <div className={this.livelitClassName}>
                    {[ this.renderTitle(), this.renderContent() ]}
               </div>
    }
};

class GeometryGallery extends LivelitWindow {
    constructor(props: Props) {
        super(props);
        this.titleText = 'Geometry Browser';
    }

    renderGalleryItem(itemNumber: number) {
        return <div className="gallery-item"
                    key={itemNumber.toString()}>
               </div>;
    }

    renderContent() {
        const numGalleryItems = 6;
        const galleryItems = [...Array(numGalleryItems).keys()].map(n => {
            return this.renderGalleryItem(n);
        });
        return <div className="content"
                    key={this.contentKey.toString()}>
                    <div className="geometry-browser">
                        { galleryItems }
                    </div>
               </div>
    }
}

class PointPicker extends LivelitWindow {
    constructor(props: Props) {
        super(props);
        this.titleText = 'Point Picker';
    }

    renderContent() {
        return <div className="point-picker">
                   <div className="table-thumbnail">
                       <div className="crosshair"></div>
                   </div>
                   <div className="point-text">
                       (154, 132)
                   </div>
                   <div className="help-text">
                       Click a point in the work envelope to update this value.
                   </div>
               </div>;
    }
}

class TabletopCalibrator extends LivelitWindow {
    machine: pair.Machine;
    tabletop: pair.Tabletop;

    constructor(props: TabletopCalibratorProps) {
        super(props);
        this.titleText = 'Tabletop Calibrator';
        this.machine = props.machine;
        this.tabletop = props.tabletop;
    }

    renderContent() {
        return <div className="tabletop-calibrator">
                   <div className="help-text">
                       1. Draw a border around the work envelope with the
                       machine.
                   </div>
                   <div className="button" id="draw-border">
                       Draw Border
                   </div>
                   <div className="help-text">
                       2. Drag the corners of the projected border to match
                       the drawn border.
                   </div>
                   <div className="button" id="unlock-corners">
                       Unlock Corners
                   </div>
                   <div className="help-text">
                       3. Press 'Apply' when you are satisfied.
                   </div>
                   <div className="button" id="apply">
                       Apply
                   </div>
               </div>;
    }
}

class FaceFinder extends LivelitWindow {
    state: FaceFinderState;
    camera: pair.Camera;

    constructor(props: FaceFinderProps) {
        super(props);
        this.titleText = 'Face Finder';
        this.camera = props.camera;
        this.state = {
            imagePath: './img/seattle-times.jpg',
            detectedRegions: []
        }
    }

    renderContent() {
        return <div className="face-finder">
                   <div className="button" id="take-photo">
                       Take Photo
                   </div>
                   <div className="image-thumbnail face-finder-thumbnail">
                       <img src={this.state.imagePath}/>
                   </div>
                   <div className="bold-text">
                       Faces Found
                   </div>
                   <ul className="face-list">
                       <li>Face 1</li>
                       <li>Face 2</li>
                       <li>Face 3</li>
                   </ul>
                   <div className="button" id="accept-faces">
                       Accept
                   </div>
               </div>;
    }
}

const inflateProgramPane = () => {
    const blankDom = document.querySelector('#program-container');
    const programPane = <ProgramPane></ProgramPane>;
    ReactDOM.render(programPane, blankDom);
};

export { inflateProgramPane };
