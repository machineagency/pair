/** This file contains React components for:
 *  - The program pane
 *  - All livelit windows and functionality as described in the Omar et al.
 *    paper.
 *  - Props of Livelit Components represent that livelit's parameter.
 *  - State of Livelit Components represent any GUI input elements within
 *    the livelit window whose splices will be used to write the expansion.
 */

/// <reference path="lib/perspective-transform.d.ts" />
import * as pair from './pair.js';

interface Props {};
interface LivelitProps {
    ref: React.Ref<LivelitWindow>;
};
interface ProgramLineProps {
    lineNumber: number;
    lineText: string;
    refForLivelit: React.Ref<LivelitWindow>;
};
interface TabletopCalibratorProps extends LivelitProps {
    machine: pair.Machine;
    tabletop: pair.Tabletop;
};
interface FaceFinderProps extends LivelitProps {
    camera: pair.Camera;
}

interface State {};
interface ProgramPaneState {
    defaultLines: string[]
};
interface ProgramLineState {
    lineText: string;
    expandedLineText: string;
    windowOpen: boolean;
    highlight: boolean;
};
interface FaceFinderState {
    camera: pair.Camera;
    imagePath: string;
    detectedRegions: pair.Region[];
}

class ProgramUtil {
    static parseTextForLivelit(text: string,
                               livelitRef: React.Ref<LivelitWindow>)
                               : JSX.Element | null {
        const re = /\$\w+/;
        const maybeMatch = text.match(re);
        const defaultEl = <div></div>;
        if (!maybeMatch) {
            return null;
        }
        const livelitName = maybeMatch[0].slice(1);
        switch (livelitName) {
            case 'geometryGallery':
                return <GeometryGallery ref={livelitRef}>
                       </GeometryGallery>;
            case 'pointPicker':
                return <PointPicker ref={livelitRef}>
                       </PointPicker>;
            case 'tabletopCalibrator':
                return <TabletopCalibrator ref={livelitRef}>
                       </TabletopCalibrator>;
            case 'faceFinder':
                return <FaceFinder ref={livelitRef}>
                       </FaceFinder>;
            default:
                return null;
        }
    }

}

class ProgramPane extends React.Component<Props, ProgramPaneState> {
    livelitRefs: React.Ref<LivelitWindow>[];

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
        'let tabletop = new pair.Tabletop();',
        'tabletop = tabletop',
        'let camera = new pair.Camera(tabletop);',
        'let mustache = new pair.Geometry(\'./toolpaths/mustache.svg\')',
        'let faceRegions = await camera.findFaceRegions();',
        'let faceCentroids = faceRegions.map(r => r.centroid);',
        'let toolpaths = faceCentroids.map(c => mustache.placeAt(c, tabletop));',
        'toolpaths.forEach(toolpath => machine.plot(toolpath));'
    ];

    defaultLinesMustacheLiveLits = [
        'let machine = new pair.Machine(\'axidraw\');',
        'let tabletop = new pair.Tabletop();',
        'tabletop = $tabletopCalibrator(tabletop, machine);',
        'let camera = new pair.Camera(tabletop);',
        'let mustache = $geometryGallery();',
        'let faceRegions = $faceFinder(camera);',
        'let faceCentroids = faceRegions.map(r => r.centroid);',
        'let toolpaths = faceCenters.map(c => mustache.placeAt(c, tabletop));',
        'toolpaths.forEach(toolpath => machine.plot(toolpath));'
    ];

    constructor(props: Props) {
        super(props);
        this.state = {
            defaultLines: this.defaultLinesMustacheLiveLits
        };
        this.livelitRefs = [];
    }

    renderTextLines(textLines: string[]) {
        this.livelitRefs = [];
        const lines = textLines.map((line, index) => {
            const lineNumber = index + 1;
            const currLineRef = React.useRef<LivelitWindow>(null);
            this.livelitRefs.push(currLineRef);
            return <ProgramLine lineNumber={lineNumber}
                                key={index}
                                refForLivelit={currLineRef}
                                lineText={line}></ProgramLine>
        }).flat();
        return lines;
    }

    gatherLivelitsAsFunctionDeclarations() : string {
        // TODO: traverse over livelit window react objects and expand,
        // don't traverse over text. Expansion is like e.g.
        // tc : TabletopCalibrator ->
        // function $tableTopCalibrator(tabletop, machine) {
        //      // We should not actually have to deal with the parameters
        //      // passed into this function because those values should be
        //      // closed over the LivelitWindow object.
        //      return tc.expand();
        // }
        debugger;
        return '';
    }

    runAllLines() {
        const extractProgramText = () => {
            const programLines = Array.from(document
                                      .getElementsByClassName('program-line-text'));
            return programLines.map(el => (el as HTMLElement).innerText).join('\n');
        };
        let progText = extractProgramText();
        let livelitFunctionDeclarations = this.gatherLivelitsAsFunctionDeclarations();
        progText  = `${livelitFunctionDeclarations};(async function() { ${progText} })();`;
        eval(progText);
    }

    render() {
        return <div className="program-pane">
            <div className="program-lines">
                { this.renderTextLines(this.state.defaultLines) }
            </div>
            <div className="program-controls">
                <div className="pc-btn pc-run"
                     onClick={this.runAllLines.bind(this)}>Run</div>
            </div>
        </div>
    }
}

class ProgramLine extends React.Component<ProgramLineProps, ProgramLineState> {

    colorSetLivelit = 0x888888;

    constructor(props: ProgramLineProps) {
        super(props);
        this.state = {
            lineText: props.lineText,
            expandedLineText: '',
            windowOpen: false,
            highlight: false
        };
    }

    hasLivelitExpansion() {
        return this.state.expandedLineText !== '';
    }

    toggleLivelitWindow() {
        this.setState((prevState) => {
            let newState: ProgramLineState = {
                lineText: prevState.lineText,
                expandedLineText: prevState.lineText,
                windowOpen: !prevState.windowOpen,
                highlight: prevState.highlight
            };
            return newState;
        })
    }

    render() {
        const highlightClass = this.state.highlight ? 'pl-highlight' : '';
        const lineNumber = this.props.lineNumber || 0;
        const livelitWindow = ProgramUtil.parseTextForLivelit(
                                this.state.lineText,
                                this.props.refForLivelit);
        // TODO: to solve the type error below, we need to go back to actyally
        // having the above parsing function parse the entire text and return
        // an entire JSX element, including livelit parameters, where the
        // ref is instantiated there.
        return <div className={`program-line ${highlightClass}`}
                    id={`line-${lineNumber - 1}`}
                    onClick={this.toggleLivelitWindow.bind(this)}>
                    <div className="program-line-text">
                        {this.state.lineText}
                    </div>
                    { livelitWindow }
               </div>
    }
}

class LivelitWindow extends React.Component {
    titleText: string;
    livelitClassName: string;
    titleKey: number;
    contentKey: number;

    constructor(props: LivelitProps) {
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

interface GeometryGalleryState {
    selectedPath: string;
};
class GeometryGallery extends LivelitWindow {
    state: GeometryGalleryState;

    constructor(props: LivelitProps) {
        super(props);
        this.titleText = 'Geometry Browser';
        this.state = {
            selectedPath: './toolpaths/mustache.svg'
        };
    }

    expand() : pair.Geometry {
        return new pair.Geometry(this.state.selectedPath);
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
    constructor(props: LivelitProps) {
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

interface TabletopCalibratorState {
    machine: pair.Machine;
    tabletop: pair.Tabletop;
    homography?: Homography;
};

class TabletopCalibrator extends LivelitWindow {
    state: TabletopCalibratorState;

    constructor(props: TabletopCalibratorProps) {
        super(props);
        this.titleText = 'Tabletop Calibrator';
        this.state = {
            machine: props.machine,
            tabletop: props.tabletop
        };
    }

    expand() {
        return (oldTabletop: pair.Tabletop) => {
            // TODO: return new tabletop with homography applied
            new pair.Tabletop();
        }
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

    constructor(props: FaceFinderProps) {
        super(props);
        this.titleText = 'Face Finder';
        this.state = {
            camera: props.camera,
            imagePath: './img/seattle-times-boxed.png',
            detectedRegions: []
        }
    }

    async expand () {
        return await this.state.camera.findFaceRegions();
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
