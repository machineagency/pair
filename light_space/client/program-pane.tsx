/** This file contains React components for:
 *  - The program pane
 *  - All livelit windows and functionality as described in the Omar et al.
 *    paper.
 *  - Props of Livelit Components represent that livelit's parameter.
 *  - State of Livelit Components represent any GUI input elements within
 *    the livelit window whose splices will be used to write the expansion.
 *  - Class Properties thereof represent the model that will eventually be
 *    returned by the livelit. Note that we cannot rely on React state for this
 *    because we need synchonicity.
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

interface State {}
interface ProgramPaneState {
    defaultLines: string[]
};
interface ProgramLineState {
    lineText: string;
    expandedLineText: string;
    windowOpen: boolean;
    highlight: boolean;
};

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
        switch (livelitName) {
            case 'geometryGallery':
                const ggProps: GeometryGalleryProps = {
                    executionBlockedStatus: executionBlockedStatus,
                    ref: livelitRef as React.Ref<GeometryGallery>
                };
                return <GeometryGallery {...ggProps}>
                       </GeometryGallery>;
            case 'pointPicker':
                const ppProps: PointPickerProps = {
                    executionBlockedStatus: executionBlockedStatus,
                    ref: livelitRef as React.Ref<PointPicker>
                };
                return <PointPicker {...ppProps}>
                       </PointPicker>;
            case 'tabletopCalibrator':
                const tcProps: TabletopCalibratorProps = {
                    machine: undefined,
                    tabletop: undefined,
                    executionBlockedStatus: executionBlockedStatus,
                    ref: livelitRef as React.Ref<TabletopCalibrator>
                };
                return <TabletopCalibrator {...tcProps}>
                       </TabletopCalibrator>;
            case 'faceFinder':
                const ffProps: FaceFinderProps = {
                    camera: undefined,
                    executionBlockedStatus: executionBlockedStatus,
                    ref: livelitRef as React.Ref<FaceFinder>
                };
                return <FaceFinder {...ffProps}>
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
        'let tabletop = await $tabletopCalibrator(machine);',
        'let camera = new pair.Camera(tabletop);',
        'let mustache = $geometryGallery(machine);',
        'let faceRegions = await $faceFinder(camera);',
        'let faceCentroids = faceRegions.map(r => r.centroid);',
        'let toolpaths = faceCentroids.map(c => mustache.placeAt(c, tabletop));',
        'toolpaths.forEach(toolpath => machine.plot(toolpath));'
    ];

    constructor(props: Props) {
        super(props);
        this.state = {
            defaultLines: this.defaultLinesMustacheLiveLits
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

    __getLivelitRefs() {
        let livelitRefs = this.livelitRefs as React.RefObject<LivelitWindow>[];
        let nonNullRefs = livelitRefs.filter((ref) => {
            return ref.current !== null;
        });
        return nonNullRefs;
    }

    getLivelitWithName(functionName: string) : State {
        let refs = this.__getLivelitRefs();
        let ref = refs.find((ref) => {
            return ref && ref.current
                   && ref.current.functionName === functionName;
        });
        if (ref && ref.current) {
            return ref.current;
        }
        else {
            return {};
        }
    }

    gatherLivelitsAsFunctionDeclarations() : string {
        interface functionStatePair {
            functionName: string;
            state: State;
        };
        let refs = this.__getLivelitRefs();
        let expandedFunctionStrings : string[] = [];
        refs.forEach((ref) => {
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
        const PROGRAM_PANE = this;
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
    props: LivelitProps;

    constructor(props: LivelitProps) {
        super(props);
        this.props = props;
        this.titleText = 'Livelit Window';
        this.functionName = '$livelit';
        this.livelitClassName = 'livelit-window';
        this.titleKey = 0;
        this.contentKey = 1;
    }

    unblockExecution() {
        this.props.executionBlockedStatus.executionBlocked = false;
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

interface GeometryGalleryProps extends LivelitProps {
    ref: React.Ref<GeometryGallery>
};

interface GeometryGalleryState {
    selectedUrl: string;
    imageNameUrlPairs: [string, string][];
};
class GeometryGallery extends LivelitWindow {
    state: GeometryGalleryState;

    constructor(props: GeometryGalleryProps) {
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
        let s = `function ${this.functionName}(machine) {`;
        // TODO: filter geometries by machine
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
                            selectedUrl: prev.selectedUrl || url,
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

interface PointPickerProps extends LivelitProps {
    ref: React.Ref<PointPicker>
};

class PointPicker extends LivelitWindow {
    props: PointPickerProps;

    constructor(props: LivelitProps) {
        super(props);
        this.props = props;
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
    tabletop?: pair.Tabletop;
};

class TabletopCalibrator extends LivelitWindow {
    state: TabletopCalibratorState;
    props: TabletopCalibratorProps;
    tabletop?: pair.Tabletop;

    constructor(props: TabletopCalibratorProps) {
        super(props);
        this.titleText = 'Tabletop Calibrator';
        this.functionName = '$tabletopCalibrator';
        this.tabletop = undefined;
        this.props = props;
        this.state = {
            tabletop: undefined
        };
    }

    expand() : string {
        let s = `async function ${this.functionName}(machine) {`;
        s += `let tc = PROGRAM_PANE.getLivelitWithName(\'$tabletopCalibrator\');`;
        s += `tc.tabletop = new pair.Tabletop(machine);`;
        s += `await PROGRAM_PANE.blockExecution();`;
        s += `return tc.tabletop;`;
        s += `}`;
        return s;
    }

    drawBorder() {
        this.tabletop?.machine.drawBorder();
    }

    unlockCorners() {
        this.tabletop?.toggleWorkEnvelopeCalibration();
    }

    unblockExecution() {
        this.tabletop?.toggleWorkEnvelopeCalibration();
        this.props.executionBlockedStatus.executionBlocked = false;
    }

    renderContent() {
        return <div className="tabletop-calibrator">
                   <div className="help-text">
                       1. Draw a border around the work envelope with the
                       machine.
                   </div>
                   <div onClick={this.drawBorder.bind(this)}
                        className="button" id="draw-border">
                       Draw Border
                   </div>
                   <div className="help-text">
                       2. Drag the corners of the projected border to match
                       the drawn border.
                   </div>
                   <div onClick={this.unlockCorners.bind(this)}
                        className="button" id="unlock-corners">
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

interface FaceFinderProps extends LivelitProps {
    camera?: pair.Camera;
    ref: React.Ref<FaceFinder>;
}

interface FaceFinderState {
    imageTaken: boolean;
    imagePath: string;
    detectedRegions: pair.Region[];
}

class FaceFinder extends LivelitWindow {
    state: FaceFinderState;
    camera?: pair.Camera;
    props: FaceFinderProps;
    photoButton: JSX.Element;
    acceptButton: JSX.Element;

    constructor(props: FaceFinderProps) {
        super(props);
        this.props = props;
        this.titleText = 'Face Finder';
        this.functionName = '$faceFinder';
        this.state = {
            imageTaken: false,
            imagePath: './img/seattle-times-boxed.png',
            detectedRegions: []
        }
        this.photoButton = <div onClick={this.takePhoto.bind(this)}
                                className="button" id="take-photo">
                               Take Photo
                           </div>
        this.acceptButton = <div className="button" id="accept-faces">
                                Accept
                            </div>
    }

    takePhoto() {
        this.setState((prev: FaceFinderProps) => {
            return {
                imageTaken: true
            };
        }, this.detectRegions);
    }

    expand() : string {
        let s = `async function ${this.functionName}(camera) {`;
        s += `let ff = PROGRAM_PANE.getLivelitWithName(\'$faceFinder\');`;
        s += `ff.camera = camera;`;
        s += `let regions = await ff.acceptDetectedRegions();`;
        s += `return regions;`;
        s += `}`;
        return s;
    }

    async detectRegions() {
        if (!this.camera) {
            return [];
        }
        let regions = await this.camera.findFaceRegions();
        return new Promise<void>((resolve) => {
            this.setState((prevState: FaceFinderState) => {
                return {
                    detectedRegions: regions
                }
            });
        });
    }

    async acceptDetectedRegions() {
        return new Promise<pair.Region[]>((resolve) => {
            let acceptDom = document.getElementById('accept-faces');
            if (acceptDom) {
                acceptDom.addEventListener('click', () => {
                    resolve(this.state.detectedRegions);
                });
            }
        });
    }

    renderResults() {
        let resultLis : JSX.Element[] = this.state.detectedRegions.map((r) => {
           return <li>{r.toString()}</li>
        })
        return resultLis;
    }

    renderContent() {
        let image = this.state.imageTaken
                        ? <img src={this.state.imagePath}/>
                        : <div></div>;
        return <div className="face-finder">
                   { this.photoButton }
                   <div className="image-thumbnail face-finder-thumbnail">
                       { image }
                   </div>
                   <div className="bold-text">
                       Faces Found
                   </div>
                   <ul className="face-list">
                        { this.renderResults() }
                   </ul>
                   { this.acceptButton }
               </div>;
    }
}

const inflateProgramPane = () => {
    const blankDom = document.querySelector('#program-container');
    const programPane = <ProgramPane></ProgramPane>;
    ReactDOM.render(programPane, blankDom);
};

export { inflateProgramPane };
