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

interface ExecutionBlockedStatus {
    executionBlocked: boolean;
}
interface Props {};
interface LivelitProps {
    ref: React.Ref<LivelitWindow>;
    executionBlockedStatus: ExecutionBlockedStatus;

};
interface ProgramLineProps {
    lineNumber: number;
    lineText: string;
    refForLivelit: React.Ref<LivelitWindow>;
    executionBlockedStatus: ExecutionBlockedStatus;
};
interface TabletopCalibratorProps extends LivelitProps {
    machine: pair.Machine | undefined;
    tabletop: pair.Tabletop | undefined;
    ref: React.Ref<TabletopCalibrator>;
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
                               executionBlockedStatus: ExecutionBlockedStatus,
                               livelitRef: React.Ref<LivelitWindow>)
                               : JSX.Element | null {
        const re = /\$\w+/;
        const maybeMatch = text.match(re);
        const defaultEl = <div></div>;
        if (!maybeMatch) {
            return null;
        }
        const livelitName = maybeMatch[0].slice(1);
        // NOTE: casting here might be wrong... But I don't know how to be right.
        switch (livelitName) {
            case 'geometryGallery':
                return <GeometryGallery
                            ref={livelitRef as React.Ref<GeometryGallery>}>
                       </GeometryGallery>;
            case 'pointPicker':
                return <PointPicker ref={livelitRef}>
                       </PointPicker>;
            case 'tabletopCalibrator':
                const props: TabletopCalibratorProps = {
                    machine: undefined,
                    tabletop: undefined,
                    executionBlockedStatus: executionBlockedStatus,
                    ref: livelitRef as React.Ref<TabletopCalibrator>
                };
                return <TabletopCalibrator {...props}>
                       </TabletopCalibrator>;
            case 'faceFinder':
                return <FaceFinder ref={livelitRef as React.Ref<FaceFinder>}>
                       </FaceFinder>;
            default:
                return null;
        }
    }

}

class ProgramPane extends React.Component<Props, ProgramPaneState> {
    livelitRefs: React.Ref<LivelitWindow>[];
    executionBlockedStatus: ExecutionBlockedStatus;

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

    defaultLivelitsNoParams = [
        'let machine = new pair.Machine(\'axidraw\');',
        'let tabletop = await $tabletopCalibrator();',
        'let camera = new pair.Camera(tabletop);',
        'let mustache = $geometryGallery();',
        'let faceRegions = $faceFinder();',
        'let faceCentroids = faceRegions.map(r => r.centroid);',
        'let toolpaths = faceCentroids.map(c => mustache.placeAt(c, tabletop));',
        'toolpaths.forEach(toolpath => machine.plot(toolpath));'
    ];

    constructor(props: Props) {
        super(props);
        this.state = {
            defaultLines: this.defaultLivelitsNoParams
        };
        this.livelitRefs = [];
        this.executionBlockedStatus = {
            executionBlocked: false
        };
    }

    renderTextLines(textLines: string[]) {
        this.livelitRefs = [];
        const lines = textLines.map((line, index) => {
            const lineNumber = index + 1;
            const currLineRef = React.createRef<LivelitWindow>();
            this.livelitRefs.push(currLineRef);
            return <ProgramLine lineNumber={lineNumber}
                                key={index}
                                executionBlockedStatus={this.executionBlockedStatus}
                                refForLivelit={currLineRef}
                                lineText={line}></ProgramLine>
        }).flat();
        return lines;
    }

    blockExecution() {
        console.log('blocking!');
        this.executionBlockedStatus.executionBlocked = true;
        const delay = 500;
        return new Promise<void>((resolve) => {
            const stall = () => {
                if (this.executionBlockedStatus.executionBlocked) {
                    console.log('stalling');
                }
                else {
                    return resolve();
                }
            };
            setInterval(stall, delay)
        });
    }

    unblockExecution() {
        this.executionBlockedStatus.executionBlocked = false;
    }

    gatherLivelitsAsFunctionDeclarations() : string {
        interface functionStatePair {
            functionName: string;
            state: State;
        };
        let livelitRefs = this.livelitRefs as React.RefObject<LivelitWindow>[];
        let nonNullRefs = livelitRefs.filter((ref) => {
            return ref.current !== null;
        });
        let expandedFunctionStrings : string[] = [];
        nonNullRefs.forEach((ref) => {
            if (ref !== null && ref.current !== null) {
                expandedFunctionStrings.push(ref.current.expand());
            }
        });
        let allExpandedFunctions = expandedFunctionStrings.join('\n');
        return allExpandedFunctions;
    }

    runAllLines() {
        const extractProgramText = () => {
            const programLines = Array.from(document
                                      .getElementsByClassName('program-line-text'));
            return programLines.map(el => (el as HTMLElement).innerText).join('\n');
        };
        let progText = extractProgramText();
        let livelitFunctionDeclarations = this.gatherLivelitsAsFunctionDeclarations();
        progText  = `${livelitFunctionDeclarations}\n(async function() { ${progText} })();`;
        console.log(progText);
        const PROGRAM = this;
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
                                this.props.executionBlockedStatus,
                                this.props.refForLivelit);
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
    functionName: string;
    livelitClassName: string;
    titleKey: number;
    contentKey: number;

    constructor(props: LivelitProps) {
        super(props);
        this.titleText = 'Livelit Window';
        this.functionName = '$livelit';
        this.livelitClassName = 'livelit-window';
        this.titleKey = 0;
        this.contentKey = 1;
    }

    expand() : string {
        return 'function livelitExpansion() { };';
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
    selectedUrl: string;
    imageNameUrlPairs: [string, string][];
};
class GeometryGallery extends LivelitWindow {
    state: GeometryGalleryState;

    constructor(props: LivelitProps) {
        super(props);
        this.titleText = 'Geometry Gallery';
        this.functionName = '$geometryGallery';
        this.state = {
            selectedUrl: '',
            imageNameUrlPairs: []
        };
        this.fetchGeometryNames();
    }

    expandOld() : pair.Geometry {
        return new pair.Geometry(this.state.selectedUrl);
    }

    expand() : string {
        let s = `function ${this.functionName}() {`;
        s += `return new pair.Geometry(\'${this.state.selectedUrl}\');`
        s += `}`;
        return s;
    }

    setSelectedGeometryUrl(url: string) {
        this.setState((state: GeometryGalleryState) => {
            return {
                selectedUrl: url
            };
        });
    }

    renderGalleryItem(name: string, url: string, itemNumber: number) {
        const maybeHighlight = this.state.selectedUrl === url
                               ? 'geometry-highlight' : '';
        return <div className={`gallery-item ${maybeHighlight}`}
                    data-geometry-name={name}
                    onClick={this.setSelectedGeometryUrl.bind(this, url)}
                    key={itemNumber.toString()}>
                    <img src={url}
                         className="gallery-image"/>
               </div>;
    }

    renderContent() {
        const galleryItems = this.state.imageNameUrlPairs.map((nameUrlPair, idx) => {
            let name = nameUrlPair[0];
            let url = nameUrlPair[1];
            return this.renderGalleryItem(name, url, idx);
        });
        return <div className="content"
                    key={this.contentKey.toString()}>
                    <div className="geometry-browser">
                        { galleryItems }
                    </div>
               </div>
    }

    async fetchGeometryNames() {
        const namesUrl = '/geometries';
        let namesRes = await fetch(namesUrl);
        if (namesRes.ok) {
            let namesJson = await namesRes.json();
            let names : string[] = namesJson.names;
            let fetchImage = async (name: string) => {
                let imageRes = await fetch(`/geometry/${name}`);
                if (imageRes.ok) {
                    let blob = await imageRes.blob();
                    let url = URL.createObjectURL(blob);
                    this.setState((prev: GeometryGalleryState) => {
                        return {
                            selectedUrl: prev.selectedUrl,
                            imageNameUrlPairs: prev.imageNameUrlPairs
                                                   .concat([[name, url]])
                        };
                    });
                };
            };
            names.forEach(fetchImage);
        }
    }
}

class PointPicker extends LivelitWindow {
    constructor(props: LivelitProps) {
        super(props);
        this.titleText = 'Point Picker';
        this.functionName = '$pointPicker';
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
    machine?: pair.Machine;
    tabletop?: pair.Tabletop;
    homography?: Homography;
};

class TabletopCalibrator extends LivelitWindow {
    state: TabletopCalibratorState;
    props: TabletopCalibratorProps;

    constructor(props: TabletopCalibratorProps) {
        super(props);
        this.titleText = 'Tabletop Calibrator';
        this.functionName = '$tabletopCalibrator';
        this.props = props;
        this.state = {
            machine: props.machine,
            tabletop: props.tabletop
        };
    }

    expandOld() : (tabletop: pair.Tabletop, camera: pair.Camera) => pair.Tabletop {
        // NOTE: the names parameters in the returned function must match the
        // livelit definition.
        return (tabletop: pair.Tabletop, camera: pair.Camera) : pair.Tabletop => {
            // TODO: return new tabletop with homography applied
            return new pair.Tabletop();
        }
    }

    expand() : string {
        let s = `async function ${this.functionName}() {`;
        s += `await PROGRAM.blockExecution();`;
        s += `return new pair.Tabletop();`;
        s += `}`;
        return s;
    }

    unblockExecution() {
        this.props.executionBlockedStatus.executionBlocked = false;
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
                   <div onClick={this.unblockExecution.bind(this)}
                        className="button" id="apply">
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
        this.functionName = '$faceFinder';
        this.state = {
            // camera: props.camera,
            camera: new pair.Camera(undefined),
            imagePath: './img/seattle-times-boxed.png',
            detectedRegions: []
        }
        // TODO: make sure we don't expand before regions are set
        this.detectRegions();
    }

    async expandOld() {
        return await this.state.camera.findFaceRegions();
    }

    async detectRegions() {
        let regions = await this.state.camera.findFaceRegions();
        this.setState((prevState: FaceFinderState) => {
            return {
                camera: prevState.camera,
                imagePath: prevState.imagePath,
                detectedRegions: regions
            }
        });
    }

    expand() : string {
        let serializedRegions = JSON.stringify(this.state.detectedRegions, undefined, 0);
        let s = `function ${this.functionName}() {`;
        s += `let regions = [];`
        this.state.detectedRegions.forEach((region, index) => {
            let name = `region${index}`;
            let corners = region.corners.map((corner) => {
                return `new pair.Point(${corner.x}, ${corner.y})`;
            });
            s += `regions.push(new pair.Region('${name}', [${corners}]));`;
        });
        s += `return regions;`;
        s += `}`;
        return s;
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
