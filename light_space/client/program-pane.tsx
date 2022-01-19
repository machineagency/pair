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
import { mm, px } from './pair.js';
(window as any).mm = mm;
(window as any).px = px;

interface Props {};
interface LivelitProps {
    /* Ref created in the parent that is a React "special" prop included here
     * such that the parent (e.g. ModulePane) has a reference to the component
     * to which this Ref has been passed as "ref." */
    ref: React.RefObject<LivelitWindow>;
    plRef: React.RefObject<ProgramLine>;
    windowOpen: boolean;
    valueSet: boolean;

};
interface ProgramLineProps {
    lineNumber: number;
    lineText: string;
    refForLivelit: React.Ref<LivelitWindow>;
};
interface State {}
interface ProgramPaneState {
    currentWorkflow: string[];
    running: boolean;
};
interface ProgramLineState {
    lineText: string;
    expandedLineText: string;
    highlight: boolean;
};

class ResetExecution extends Error {
    constructor() {
        let message = 'Resetting execution.';
        super(message);
    }
}

class ProgramUtil {
    static parseTextForLivelit(text: string,
                               plRef: React.RefObject<ProgramLine>,
                               livelitRef: React.RefObject<LivelitWindow>)
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
                    ref: livelitRef as React.RefObject<GeometryGallery>,
                    plRef: plRef,
                    valueSet: false,
                    windowOpen: false
                };
                return <GeometryGallery {...ggProps}>
                       </GeometryGallery>;
            case 'pointPicker':
                const ppProps: PointPickerProps = {
                    ref: livelitRef as React.RefObject<PointPicker>,
                    plRef: plRef,
                    valueSet: false,
                    windowOpen: false
                };
                return <PointPicker {...ppProps}>
                       </PointPicker>;
            case 'tabletopCalibrator':
                const tcProps: TabletopCalibratorProps = {
                    machine: undefined,
                    tabletop: undefined,
                    ref: livelitRef as React.RefObject<TabletopCalibrator>,
                    plRef: plRef,
                    valueSet: false,
                    windowOpen: false
                };
                return <TabletopCalibrator {...tcProps}>
                       </TabletopCalibrator>;
            case 'cameraCalibrator':
                const ccProps: CameraCalibratorProps = {
                    ref: livelitRef as React.RefObject<CameraCalibrator>,
                    plRef: plRef,
                    valueSet: false,
                    windowOpen: false
                }
                return <CameraCalibrator {...ccProps}></CameraCalibrator>;
            case 'faceFinder':
                const ffProps: FaceFinderProps = {
                    camera: undefined,
                    ref: livelitRef as React.RefObject<FaceFinder>,
                    plRef: plRef,
                    valueSet: false,
                    windowOpen: false
                };
                return <FaceFinder {...ffProps}>
                       </FaceFinder>;
            case 'camCompiler':
                const camProps: CamCompilerProps = {
                    ref: livelitRef as React.RefObject<CamCompiler>,
                    plRef: plRef,
                    valueSet: false,
                    windowOpen: false
                };
                return <CamCompiler {...camProps}>
                       </CamCompiler>
            case 'toolpathVisualizer':
                const tdProps: ToolpathVisualizerProps = {
                    ref: livelitRef as React.RefObject<ToolpathVisualizer>,
                    plRef: plRef,
                    valueSet: false,
                    windowOpen: false
                };
                return <ToolpathVisualizer {...tdProps}></ToolpathVisualizer>;
            default:
                return null;
        }
    }
}

class ProgramPane extends React.Component<Props, ProgramPaneState> {
    livelitRefs: React.RefObject<LivelitWindow>[];
    plRefs: React.RefObject<ProgramLine>[];
    modulePaneRef: React.RefObject<ModulePane>;

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
        'let camera = await $cameraCalibrator(tabletop);',
        'let mustache = await $geometryGallery(machine);',
        'let faceRegions = await $faceFinder(camera);',
        'let mustachePoints = faceRegions.map(r => r.centroid.add(0, 0.25 * r.height));',
        'let toolpaths = await Promise.all(mustachePoints.map(pt => mustache.placeAt(pt, tabletop)));',
        // TODO: combine toolpaths into one object which will become one svg. in fact,
        // maybe we should just place geometries, and then only form a single toolpath
        // at the very end.
        'toolpaths.forEach(toolpath => machine.plotToolpathOnTabletop(toolpath, tabletop));'
    ];

    defaultToolpathPreviewing = [
        'let machine = new pair.Machine(\'axidraw\');',
        '// TODO: pen up calibrator with preview',
        'let tabletop = await $tabletopCalibrator(machine);',
        'let camera = await $cameraCalibrator(tabletop);',
        'let point = new pair.Point(mm(75), mm(25));',
        'let mustache = await $geometryGallery(machine, tabletop);',
        '// TODO: use either camera or toolpath direct manipulator',
        'let placedMustache = mustache.placeAt(point, tabletop);',
        'let toolpath = await $camCompiler(machine, placedMustache);',
        'let visualizer = await $toolpathVisualizer(machine, [toolpath], tabletop);'
    ];

    constructor(props: Props) {
        super(props);
        this.state = {
            currentWorkflow: this.defaultToolpathPreviewing,
            running: false
        };
        this.livelitRefs = [];
        this.plRefs = [];
        this.modulePaneRef = React.createRef<ModulePane>();
    }

    componentDidMount() {
        document.querySelectorAll('pre code').forEach((el) => {
            hljs.highlightElement(el);
        });
    }

    renderTextLines(textLines: string[]) {
        this.livelitRefs = [];
        this.plRefs = [];
        const lines = textLines.map((line, index) => {
            const lineNumber = index + 1;
            const livelitRef = React.createRef<LivelitWindow>();
            const plRef = React.createRef<ProgramLine>();
            this.plRefs.push(plRef);
            this.livelitRefs.push(livelitRef);
            return <ProgramLine lineNumber={lineNumber}
                                key={index}
                                refForLivelit={livelitRef}
                                ref={plRef}
                                lineText={line}></ProgramLine>
        }).flat();
        if (this.modulePaneRef.current) {
            this.modulePaneRef.current.updateProgramLineRefs(this.plRefs);
        }
        return lines;
    }

    __getModules() : LivelitWindow[] {
        let modules : LivelitWindow[] = [];
        if (this.modulePaneRef.current) {
            let maybeNullMods = this.modulePaneRef.current.getModules();
            let nonNullMods = maybeNullMods.filter((mod) : mod is LivelitWindow => {
                return mod !== null;
            });
            return nonNullMods;
        }
        else {
            return [];
        }
    }

    getLivelitWithName(functionName: string) : State {
        let modules = this.__getModules();
        let moduleWindow = modules.find((mod) => {
            return mod.functionName === functionName;
        });
        return moduleWindow ? moduleWindow : {};
    }

    gatherLivelitsAsFunctionDeclarations() : string {
        interface functionStatePair {
            functionName: string;
            state: State;
        };
        let mods = this.__getModules();
        let expandedFunctionStrings : string[] = [];
        mods.forEach((mod) => {
            if (mod) {
                expandedFunctionStrings.push(mod.expand());
            }
        });
        let allExpandedFunctions = expandedFunctionStrings.join('\n');
        return allExpandedFunctions;
    }

    runAllLines() {
        if (this.state.running) {
            return;
        }
        const extractProgramText = () => {
            const programLines = Array.from(document
                                      .getElementsByClassName('program-line-text'));
            return programLines.map(el => (el as HTMLElement).innerText).join('\n');
        };
        const PROGRAM_PANE = this;
        this.setRunning(true, () => {
            let innerProgText = extractProgramText();
            let livelitFunctionDeclarations = this.gatherLivelitsAsFunctionDeclarations();
            let progText  = `${livelitFunctionDeclarations}`;
            progText += `\n(async function() {`;
            progText += `paper.project.clear();`;
            progText += `try {`;
            progText += `${innerProgText}`;
            progText += `} catch (e) {`;
            progText += `if (e.name === 'ResetExecution') { console.log(e.message) }`;
            progText += `else { throw e; }`;
            progText += `} finally { PROGRAM_PANE.setRunning(false); }`;
            progText += `})();`;
            console.log(progText);
            eval(progText);
        });
    }

    setRunning(running: boolean, callback: () => void | undefined) {
        this.setState(_ => {
            return { running: running };
        }, callback);
    }

    resetExecution() {
        let modulePane = this.modulePaneRef.current;
        if (!modulePane) {
            return;
        }
        let openModuleRef = modulePane.moduleRefs.find((moduleRef) => {
            let currModule = moduleRef.current;
            if (!currModule) {
                return;
            }
            return currModule.state.windowOpen;
        });
        if (openModuleRef) {
            let openModule = openModuleRef.current;
            if (!openModule) {
                return;
            }
            openModule.setState(_ => {
                return { abortOnResumingExecution: true };
            }, () => {
                if (openModule && openModule.applyButton) {
                    // This is a hack... I am aware.
                    let applyButton = document
                        .querySelector(':not(.hidden) > .apply-btn') as HTMLElement;
                    if (applyButton) {
                        applyButton.click();
                    }
                }
            });
        }
    }

    compile() {
        if (this.state.running) {
            return;
        }
        // We will probably want to promise chain off of this, rejecting if
        // we fail type check.
        this.typeCheck();
        if (this.modulePaneRef.current) {
            this.modulePaneRef.current.setState((prevState: ModulePaneState) => {
                return { lines: this.state.currentWorkflow }
            });
        }
    }

    typeCheck() {
        console.log('Looks good to me @_@');
    }

    render() {
        let maybeGrayed = this.state.running ? 'grayed' : '';
        let hiddenIffNotRunning = this.state.running ? '' : 'hidden';
        return (
            <div id="program-pane">
                <div id="program-lines-and-controls">
                    <div id="program-lines">
                        { this.renderTextLines(this.state.currentWorkflow) }
                    </div>
                    <div id="program-controls">
                        <div className={`pc-btn pc-compile ${maybeGrayed}`}
                             onClick={this.compile.bind(this)}>
                            Generate
                        </div>
                        <div className={`pc-btn pc-run ${maybeGrayed}`}
                             onClick={this.runAllLines.bind(this)}>
                             Run
                        </div>
                        <div className={`pc-btn pc-reset ${hiddenIffNotRunning}`}
                             onClick={this.resetExecution.bind(this)}>
                             Reset
                        </div>
                    </div>
                </div>
                <ModulePane plRefs={this.plRefs}
                            ref={this.modulePaneRef}></ModulePane>
            </div>
        );
    }
}

interface ModulePaneProps extends Props {
    plRefs: React.RefObject<ProgramLine>[];
}

interface ModulePaneState extends State {
    lines: string[];
}

class ModulePane extends React.Component<ModulePaneProps, ModulePaneState> {
    moduleRefs: React.RefObject<LivelitWindow>[];
    plRefs: React.RefObject<ProgramLine>[];

    constructor(props: ModulePaneProps) {
        super(props);
        this.moduleRefs = [];
        this.plRefs = props.plRefs;
        this.state = {
            lines: []
        };
    }

    getModules() {
        let modules = this.moduleRefs.map(ref => {
            return ref ? ref.current : null;
        });
        let nonNullModules = modules.filter(maybeModule => maybeModule !== null);
        return nonNullModules;
    }

    mapLinesToLivelits() : JSX.Element[] {
        let livelits = this.state.lines.map((lineText, lineIndex) => {
            let plRef = this.plRefs[lineIndex];
            let moduleRef = React.createRef<LivelitWindow>();
            this.moduleRefs.push(moduleRef);
            return ProgramUtil.parseTextForLivelit(lineText, plRef, moduleRef);
        });
        let nonNullLiveLits = livelits.filter((ll): ll is JSX.Element => {
            return ll !== null;
        });
        return nonNullLiveLits;
    }

    updateProgramLineRefs(plRefs: React.RefObject<ProgramLine>[]) {
        this.plRefs = plRefs;
        this.moduleRefs.forEach((ref, refIndex) => {
            if (!ref.current) {
                return;
            }
            let moduleWindow = ref.current;
            let moduleLineNumber = refIndex;
            let correspondingPlRef = this.plRefs[moduleLineNumber];
            moduleWindow.plRef = correspondingPlRef;
        });
    }

    render() {
        return (
            <div id="module-pane" key="module-pane">
                { this.mapLinesToLivelits() }
            </div>
        );
    }
}

class ProgramLine extends React.Component<ProgramLineProps, ProgramLineState> {

    colorSetLivelit = 0x888888;

    constructor(props: ProgramLineProps) {
        super(props);
        this.state = {
            lineText: props.lineText,
            expandedLineText: '',
            highlight: false
        };
    }

    hasLivelitExpansion() {
        return this.state.expandedLineText !== '';
    }

    toggleLivelitWindow() {
        this.setState((prevState) => {
            // TODO: set livelit state.windowOpen
            let newState: ProgramLineState = {
                lineText: prevState.lineText,
                expandedLineText: prevState.lineText,
                highlight: prevState.highlight
            };
            return newState;
        })
    }

    render() {
        const highlightClass = this.state.highlight ? 'pl-highlight' : '';
        const lineNumber = this.props.lineNumber || 0;
        return <div className={`program-line ${highlightClass}`}
                    id={`line-${lineNumber - 1}`}
                    onClick={this.toggleLivelitWindow.bind(this)}>
                    <pre className="program-line-text language-typescript"><code>
                        {this.state.lineText}
                    </code></pre>
               </div>
    }
}

interface LivelitState {
    windowOpen: boolean;
    valueSet: boolean;
    abortOnResumingExecution: boolean;
}

class LivelitWindow extends React.Component {
    titleText: string;
    functionName: string;
    livelitClassName: string;
    titleKey: number;
    contentKey: number;
    plRef: React.RefObject<ProgramLine>;
    applyButton?: JSX.Element;
    props: LivelitProps;
    state: LivelitState;

    constructor(props: LivelitProps) {
        super(props);
        this.props = props;
        this.titleText = 'Livelit Window';
        this.functionName = '$livelit';
        this.livelitClassName = 'livelit-window';
        this.titleKey = 0;
        this.contentKey = 1;
        this.plRef = props.plRef;
        this.state = {
            windowOpen: props.windowOpen,
            abortOnResumingExecution: false,
            valueSet: props.valueSet,
        }
    }

    expand() : string {
        return 'function livelitExpansion() { };';
    }

    async openWindow() {
        if (this.props.plRef.current) {
            await this.props.plRef.current.setState(_ => {
                return { highlight: true };
            });
        }
        return this._setWindowOpenState(true);
    }

    async closeWindow() {
        let abortBeforeFunctionReturn = this.state.abortOnResumingExecution;
        await this.setState((prev: LivelitState) => {
            return { abortOnResumingExecution: false };
        });
        if (this.props.plRef.current) {
            await this.props.plRef.current.setState(_ => {
                return { highlight: false };
            });
        }
        let windowToClose = await this._setWindowOpenState(false);
        if (abortBeforeFunctionReturn) {
            this.handleAbortExecution();
        }
        return windowToClose;
    }

    async _setWindowOpenState(open: boolean) {
        return new Promise<void>((resolve) => {
            this.setState((prev: LivelitState) => {
                return { windowOpen: open };
            }, resolve);
        });
    };


    handleAbortExecution() : never {
        throw new ResetExecution();
    }

    saveValue() : any {
        return undefined;
    }

    clearSavedValue() : Promise<void> {
        return new Promise<void>((resolve) => {
            resolve();
        });
    }

    renderTitle() {
        return <div className="title"
                    key={this.titleKey.toString()}>
                    {this.titleText}
               </div>;
    }

    renderValue() {
        let maybeGrayed = this.state.valueSet ? '' : 'grayed';
        return (
            <div className={`module-value ${maybeGrayed}`}
                 key={`${this.titleKey}-value`}>
                 I am the value.
            </div>
        );
    }

    renderContent() {
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        return <div className={`content ${maybeHidden}`}
                    key={this.contentKey.toString()}>
               </div>;
    }

    renderClearButton() {
        let hiddenIffUnset = this.state.valueSet ? '' : 'hidden';
        return (
            <div className={`clear-btn ${hiddenIffUnset}`}
                 onClick={this.clearSavedValue.bind(this)}
                 key={`${this.titleKey}-clear-value`}>
                Clear
            </div>
        );
    }

    render() {
        return <div className={this.livelitClassName}
                    key={this.livelitClassName}>
                    {[ this.renderTitle(),
                       this.renderValue(),
                       this.renderClearButton(),
                       this.renderContent() ]}
               </div>
    }
};

interface GeometryGalleryProps extends LivelitProps {
    ref: React.RefObject<GeometryGallery>;
    windowOpen: boolean;
};

interface GeometryGalleryState extends LivelitState {
    selectedUrl: string;
    imageNameUrlPairs: [string, string][];
};
class GeometryGallery extends LivelitWindow {
    state: GeometryGalleryState;
    applyButton: JSX.Element;

    constructor(props: GeometryGalleryProps) {
        super(props);
        this.titleText = 'Geometry Gallery';
        this.functionName = '$geometryGallery';
        this.applyButton = <div className="button apply-btn" id="choose-geometry">
                                Choose
                            </div>
        this.state = {
            selectedUrl: '',
            imageNameUrlPairs: [],
            windowOpen: props.windowOpen,
            abortOnResumingExecution: false,
            valueSet: props.valueSet
        };
        this.fetchGeometryNames()
            .then((imageNameUrlPairs: [string, string][]) => {
                let maybeSavedName = this.loadSavedValue();
                let selectedUrl = '';
                let valueSet = false;
                if (maybeSavedName) {
                    selectedUrl = this.getUrlForGeometryName(maybeSavedName,
                                    imageNameUrlPairs);
                    valueSet = true;
                }
                this.setState(_ => ({ selectedUrl, imageNameUrlPairs, valueSet }));
            });
    }

    expand() : string {
        let s = `async function ${this.functionName}(machine, tabletop) {`;
        // TODO: filter geometries by machine
        s += `let gg = PROGRAM_PANE.getLivelitWithName(\'${this.functionName}\');`;
        s += `let geomUrl;`;
        s += `if (!gg.state.valueSet) {`;
        s += `await gg.openWindow();`
        s += `geomUrl = await gg.waitForGeometryChosen();`;
        s += `await gg.saveValue();`;
        s += `await gg.closeWindow();`
        s += `}`;
        s += `else {`;
        s += `geomUrl = gg.state.selectedUrl;`;
        s += `}`;
        s += `let geom = new pair.Geometry(tabletop);`;
        s += `await geom.loadFromFilepath(geomUrl);`;
        s += `return geom;`;
        s += `}`;
        return s;
    }

    /**
     * Save the name of the geometry since URLs are volatile.
     */
    saveValue() {
        if (this.state.abortOnResumingExecution) {
            return;
        }
        return new Promise<void>((resolve) => {
            if (this.state.selectedUrl) {
                let geomName = this.getGeometryNameForUrl(this.state.selectedUrl);
                localStorage.setItem(this.functionName, geomName);
                this.setState(_ => {
                    return {
                        valueSet: true
                    }
                }, resolve);
            }
            else {
                console.warn('GeometryGallery: Could not save geometry name.');
            }
        });
    }

    /**
     * Load a saved name if it exists, else undefined. The caller must convert
     * the name to a URL if needed.
     */
    loadSavedValue() {
        let geomName = localStorage.getItem(this.functionName);
        return geomName;
    }

    clearSavedValue() {
        return new Promise<void>((resolve) => {
            localStorage.removeItem(this.functionName);
            this.setState(_ => {
                return {
                    selectedUrl: '',
                    valueSet: false
                }
            }, resolve);
        });
    }

    setSelectedGeometryUrl(url: string) {
        this.setState((state: GeometryGalleryState) => {
            return {
                selectedUrl: url
            };
        });
    }

    async waitForGeometryChosen() : Promise<string>{
        return new Promise<string>((resolve) => {
            const chooseDom = document.getElementById('choose-geometry');
            if (chooseDom) {
                chooseDom.addEventListener('click', (event) => {
                    resolve(this.state.selectedUrl);
                });
            }
            else {
                resolve('');
            }
        });
    }

    renderGalleryItem(name: string, url: string, itemNumber: number) {
        const maybeHighlight = this.state.selectedUrl === url
                               ? 'gallery-highlight' : '';
        return <div className={`gallery-item ${maybeHighlight}`}
                    data-geometry-name={name}
                    onClick={this.setSelectedGeometryUrl.bind(this, url)}
                    key={itemNumber.toString()}>
                    <img src={url}
                         className="gallery-image"/>
               </div>;
    }

    getUrlForGeometryName(desiredName: string, pairs?: [string, string][]) {
        let pairList = pairs || this.state.imageNameUrlPairs;
        let pairWithName = pairList.find((pair) => {
            let geomName = pair[0];
            let geomUrl = pair[1];
            return geomName === desiredName;
        });
        let currentUrl = pairWithName ? pairWithName[1] : '';
        return currentUrl;
    }

    getGeometryNameForUrl(url: string, pairs?: [string, string][]) {
        let pairList = pairs || this.state.imageNameUrlPairs;
        let pairWithSelectedUrl = pairList.find((pair) => {
            let geomName = pair[0];
            let geomUrl = pair[1];
            return geomUrl === this.state.selectedUrl;
        });
        let geomName = pairWithSelectedUrl ? pairWithSelectedUrl[0] : '';
        return geomName;
    }

    renderValue() {
        let maybeGrayed = this.state.valueSet ? '' : 'grayed';
        let geomName = this.getGeometryNameForUrl(this.state.selectedUrl);
        return (
            <div className={`module-value ${maybeGrayed}`}
                 key={`${this.titleKey}-value`}>
                 { geomName }
            </div>
        );
    }

    renderContent() {
        const galleryItems = this.state.imageNameUrlPairs.map((nameUrlPair, idx) => {
            let name = nameUrlPair[0];
            let url = nameUrlPair[1];
            return this.renderGalleryItem(name, url, idx);
        });
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        // TODO: if we hide options, instead show a preview of the currently
        // saved geometry
        return <div className={`content ${maybeHidden}`}
                    key={this.contentKey.toString()}>
                    <div className="gallery">
                        { galleryItems }
                    </div>
                    { this.applyButton }
               </div>
    }

    async fetchGeometryNames() : Promise<[string, string][]> {
        return new Promise<[string, string][]>(async (resolve) => {
            const namesUrl = '/geometries';
            let namesRes = await fetch(namesUrl);
            if (namesRes.ok) {
                let namesJson = await namesRes.json();
                let names : string[] = namesJson.names;
                let fetchImageUrl = async (name: string) => {
                    let imageRes = await fetch(`/geometry/${name}`);
                    if (imageRes.ok) {
                        let blob = await imageRes.blob();
                        let url = URL.createObjectURL(blob);
                        return url;
                    };
                    return '';
                };
                let urls: string[] = await Promise.all(names.map(fetchImageUrl));
                let nameUrlPairs: [string, string][] = names.map((name, idx) => {
                    let url: string = urls[idx] || '';
                    return [name, url];
                });
                resolve(nameUrlPairs);
            }
            else {
                resolve([]);
            }
        });
    }
}

interface PointPickerProps extends LivelitProps {
    ref: React.RefObject<PointPicker>;
    windowOpen: boolean;
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
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        return <div className={`point-picker content ${maybeHidden}`}
                    key={this.contentKey.toString()}>
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

interface TabletopCalibratorProps extends LivelitProps {
    machine: pair.Machine | undefined;
    tabletop: pair.Tabletop | undefined;
    ref: React.RefObject<TabletopCalibrator>;
    windowOpen: boolean;
};

interface TabletopCalibratorState extends LivelitState {
    tabletop?: pair.Tabletop;
    pixelToPhysical?: Homography;
};

class TabletopCalibrator extends LivelitWindow {
    state: TabletopCalibratorState;
    props: TabletopCalibratorProps;
    tabletop?: pair.Tabletop;
    applyButton: JSX.Element;

    constructor(props: TabletopCalibratorProps) {
        super(props);
        this.titleText = 'Tabletop Calibrator';
        this.functionName = '$tabletopCalibrator';
        this.tabletop = undefined;
        this.props = props;
        let maybeSavedHomography = this.loadSavedValue();
        this.state = {
            tabletop: undefined,
            windowOpen: props.windowOpen,
            abortOnResumingExecution: false,
            pixelToPhysical: maybeSavedHomography,
            valueSet: !!maybeSavedHomography
        };
        this.applyButton = <div className="button apply-btn"
                                id="apply-tabletop-homography">
                                Apply
                            </div>
    }

    // FIXME: this doesn't properly apply saved homographies yet
    expand() : string {
        let s = `async function ${this.functionName}(machine) {`;
        s += `let tc = PROGRAM_PANE.getLivelitWithName(\'$tabletopCalibrator\');`;
        s += `tc.tabletop = new pair.Tabletop(machine);`;
        s += 'if (!tc.state.valueSet) {';
        s += 'await tc.openWindow();';
        s += `await tc.applyTabletopHomography();`;
        s += `await tc.saveValue();`;
        s += 'await tc.closeWindow();';
        s += '}';
        s += 'else {';
        s += 'tc.tabletop.homography = tc.state.pixelToPhysical;';
        s += '}';
        s += `machine.tabletop = tc.tabletop;`;
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

    applyTabletopHomography() {
        return new Promise<void>((resolve) => {
            const applyButtonDom = document.getElementById('apply-tabletop-homography');
            if (applyButtonDom) {
                applyButtonDom.addEventListener('click', (event) => {
                    if (!this.state.abortOnResumingExecution) {
                        this.tabletop?.setHomographyFromCalibration();
                    }
                    resolve();
                });
            }
        });
    }

    saveValue() {
        if (this.state.abortOnResumingExecution) {
            return;
        }
        return new Promise<void>((resolve) => {
            if (this.tabletop) {
                let h = this.tabletop.workEnvelope.homography;
                let hSerialized = JSON.stringify(h);
                localStorage.setItem(this.functionName, hSerialized);
                this.setState(_ => {
                    return {
                        pixelToPhysical: h,
                        valueSet: true
                    }
                }, resolve);
            }
            else {
                console.warn('TabletopCalibrator: Could not save homography.');
            }
        });
    }

    loadSavedValue() {
        interface RevivedHomography {
            srcPts: number[];
            dstPts: number[];
            coeffs: number[];
            coeffsInv: number[];
        }
        let coeffsStr = localStorage.getItem(this.functionName);
        if (coeffsStr) {
            let revivedH = JSON.parse(coeffsStr) as RevivedHomography;
            // Hopefully no numerical errors here.
            let h = PerspT(revivedH.srcPts, revivedH.dstPts);
            return h;
        }
        else {
            return undefined;
        }
    }

    clearSavedValue() {
        return new Promise<void>((resolve) => {
            localStorage.removeItem(this.functionName);
            this.setState(_ => {
                return {
                    pixelToPhysical: undefined,
                    valueSet: false
                }
            }, resolve);
        });
    }

    renderValue() {
        let grayedIffUnset = this.state.valueSet ? '' : 'grayed';
        let hiddenIffUnset = this.state.valueSet ? '' : 'hidden';
        let value = this.state.pixelToPhysical
                        ? this.state.pixelToPhysical.coeffs.toString()
                        : '?';
        let display = `Tabletop(WorkEnvelope(pixelToPhysical: `
                      + `[${value}]))`;
        return (
            <div className={`module-value ${grayedIffUnset}`}
                 key={`${this.titleKey}-value`}>
                 { display }
            </div>
        );
    }

    renderContent() {
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        return <div className={`tabletop-calibrator content ${maybeHidden}`}
                    key={this.contentKey.toString()}>
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
                   { this.applyButton }
               </div>;
    }
}

interface CameraCalibratorProps extends LivelitProps {
    ref: React.RefObject<CameraCalibrator>;
    windowOpen: boolean;
}

interface CameraCalibratorState extends LivelitState {
    unwarpedImageUrl: string;
    warpedImageUrl: string;
    /* Make this H optional rather than initializing it as an identity
     * because we are having a lot of problems producing an identity. */
    extrinsicTransform?: Homography;
    selectedPoints: pair.Point[];
};

class CameraCalibrator extends LivelitWindow {
    props: LivelitProps;
    state: CameraCalibratorState;
    tabletop?: pair.Tabletop;
    camera: pair.Camera;
    applyButtonId: string;
    applyButton: JSX.Element;
    photoButtonId: string;
    photoButton: JSX.Element;

    constructor(props: CameraCalibratorProps) {
        super(props);
        this.props = props;
        this.camera = new pair.Camera();
        this.titleText = 'Camera Calibrator';
        this.functionName = '$cameraCalibrator';
        this.applyButtonId = 'apply-camera-homography';
        this.applyButton = <div className="button apply-btn"
                                id={this.applyButtonId}>
                                Apply
                            </div>
        this.photoButtonId = 'cc-take-photo';
        this.photoButton = <div onClick={this.takePhoto.bind(this)}
                                className="button" id={this.photoButtonId}>
                               Take Photo
                           </div>
        let maybeSavedExtrinsicTransform = this.loadSavedValue();
        this.state = {
            unwarpedImageUrl: '',
            warpedImageUrl: '',
            extrinsicTransform: maybeSavedExtrinsicTransform,
            windowOpen: this.props.windowOpen,
            abortOnResumingExecution: false,
            valueSet: !!maybeSavedExtrinsicTransform,
            selectedPoints: []
        };
    }

    setImageToTableScaling(camera: pair.Camera) {
        let feedDom = document.getElementById('cc-unwarped-feed') as HTMLImageElement;
        if (feedDom && this.tabletop) {
            if (feedDom.naturalWidth === 0 || feedDom.naturalHeight === 0) {
                console.warn('Camera Calibrator: window to table scaling '
                    + 'is incorrect because there is no image yet.');
            }
            camera.imageToTabletopScale.x = this.tabletop.workEnvelope.width
                / feedDom.naturalWidth
            camera.imageToTabletopScale.y = this.tabletop.workEnvelope.height
                / feedDom.naturalHeight
        }
        else {
            console.warn('Camera Calibrator: could not set window to table scaling.');
        }
    }

    async acceptCameraWarp() : Promise<pair.Camera> {
        return new Promise<pair.Camera>((resolve) => {
            const applyButton = document.getElementById(this.applyButtonId);
            if (applyButton) {
                applyButton.addEventListener('click', (event) => {
                    this.camera.extrinsicTransform = this.state.extrinsicTransform;
                    this.setImageToTableScaling(this.camera);
                    resolve(this.camera);
                });
            }
        });
    }

    saveValue() {
        return new Promise<void>((resolve, reject) => {
            if (this.camera.extrinsicTransform) {
                let h = this.camera.extrinsicTransform;
                let hSerialized = JSON.stringify(h);
                localStorage.setItem(this.functionName, hSerialized);
                this.setState(_ => {
                    return {
                        extrinsicTransform: h,
                        valueSet: true
                    }
                }, resolve);
            }
            else {
                console.warn('CameraCalibrator: Could not save homography.');
                resolve();
            }
        });
    }

    loadSavedValue() {
        interface RevivedHomography {
            srcPts: number[];
            dstPts: number[];
            coeffs: number[];
            coeffsInv: number[];
        }
        let coeffsStr = localStorage.getItem(this.functionName);
        if (coeffsStr) {
            let revivedH = JSON.parse(coeffsStr) as RevivedHomography;
            // Hopefully no numerical errors here.
            let h = PerspT(revivedH.srcPts, revivedH.dstPts);
            return h;
        }
        else {
            return undefined;
        }
    }

    clearSavedValue() {
        return new Promise<void>((resolve) => {
            localStorage.removeItem(this.functionName);
            this.setState(_ => {
                return {
                    extrinsicTransform: undefined,
                    valueSet: false
                }
            }, resolve);
        });
    }

    expand() : string {
        let s = `async function ${this.functionName}(tabletop) {`;
        s += `let cc = PROGRAM_PANE.getLivelitWithName(\'${this.functionName}\');`;
        s += `cc.tabletop = tabletop;`;
        s += `cc.camera.tabletop = cc.tabletop;`;
        s += `if (!cc.state.valueSet) {`;
        s += `await cc.openWindow();`;
        s += `await cc.takePhoto();`;
        s += `await cc.acceptCameraWarp();`;
        s += `await cc.saveValue();`;
        s += `await cc.closeWindow();`;
        s += `}`;
        s += `else {`;
        s += `let extrinsicTransform = cc.loadSavedValue();`;
        s += `cc.camera.extrinsicTransform = extrinsicTransform;`;
        s += `cc.setImageToTableScaling(cc.camera);`;
        s += `}`;
        s += `return cc.camera;`;
        s += `}`;
        return s;
    }

    drawBorder() {
        this.tabletop?.machine.drawBorder();
    }

    async takePhoto() {
        let imageUrl = await this.camera?.takePhoto();
        if (imageUrl) {
            this.setState((prev: CameraCalibratorState) => {
                return {
                    unwarpedImageUrl: imageUrl
                };
            })
        }
    }

    selectPoint(event: React.MouseEvent<HTMLImageElement>) {
        const target = event.target as HTMLImageElement;
        if (target) {
            const maybeInitiateWarp = async () => {
                if (this.state.selectedPoints.length === 4) {
                    // UL, UR, LR, LL
                    let cameraPointsUnrolled = [
                       [0, 0],
                       [target.naturalWidth, 0],
                       [target.naturalWidth, target.naturalHeight],
                       [0, target.naturalHeight]
                    ].flat();
                    let selectedPointsUnrolled = [
                        this.state.selectedPoints[0].flatten(),
                        this.state.selectedPoints[1].flatten(),
                        this.state.selectedPoints[2].flatten(),
                        this.state.selectedPoints[3].flatten()
                    ].flat();
                    let h = PerspT(cameraPointsUnrolled,
                                   selectedPointsUnrolled);
                    let url = `/camera/warpLastPhoto?coeffs=${h.coeffs}`
                    let res = await fetch(url);
                    if (res.ok) {
                        let blob = await res.blob();
                        let url = URL.createObjectURL(blob);
                        this.setState((prev: CameraCalibratorState) => {
                            return {
                                selectedPoints: [],
                                warpedImageUrl: url,
                                extrinsicTransform: h
                            };
                        });
                    }
                }
            };
            const cameraHeight = target.naturalHeight;
            const cameraWidth = target.naturalWidth;
            const scaledDownHeight = target.height;
            const scaledDownWidth = target.width;
            const domBoundingRect = target.getBoundingClientRect();
            const scaledX = event.clientX - domBoundingRect.left;
            const scaledY = event.clientY - domBoundingRect.top;
            const x = scaledX * (cameraWidth / scaledDownWidth);
            const y = scaledY * (cameraHeight / scaledDownHeight);
            const pt = new pair.Point(x, y);
            this.setState((prev: CameraCalibratorState) => {
                return {
                    selectedPoints: prev.selectedPoints.concat(pt)
                };
            }, maybeInitiateWarp)
        }
    }

    renderValue() {
        let maybeGrayed = this.state.valueSet ? '' : 'grayed';
        let value = this.state.extrinsicTransform
                    ? this.state.extrinsicTransform.coeffs.toString()
                    : '?';
        return (
            <div className={`module-value ${maybeGrayed}`}
                 key={`${this.titleKey}-value`}>
                 { `Camera(extrinsicTransform: [${value}], ...)` }
            </div>
        );
    }

    renderContent() {
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        return <div className={`camera-calibrator content ${maybeHidden}`}
                    key={this.contentKey.toString()}>
                   <div className="help-text">
                       1. Draw a border around the work envelope with the
                       machine (skip if it's already there).
                   </div>
                   <div onClick={this.drawBorder.bind(this)}
                        className="button" id="draw-border">
                       Draw Border
                   </div>
                   <div className="help-text">
                       2. Make sure the camera is stationary, then click on the
                       four corners of the drawn border within the camera feed.
                       Click the points in the following order:
                   </div>
                   <div className="help-text">
                       <strong>upper left, upper right, lower right, lower left.</strong>
                   </div>
                   { this.photoButton }
                   <div className="image-thumbnail">
                       <img src={this.state.unwarpedImageUrl}
                            onClick={this.selectPoint.bind(this)}
                            id="cc-unwarped-feed"
                            alt="unwarped camera Feed"/>
                   </div>
                   <div className="help-text">
                       <strong>{ this.state.selectedPoints.length }</strong> points selected.
                   </div>
                   <div className="help-text">
                       3. Check the preview below and press 'Apply' when you
                       are satisfied.
                   </div>
                   <div className="image-thumbnail">
                       <img src={this.state.warpedImageUrl}
                            id="cc-warped-feed"
                            alt="warped camera Feed"/>
                   </div>
                   { this.applyButton }
               </div>;
    }
}

interface FaceFinderProps extends LivelitProps {
    camera?: pair.Camera;
    ref: React.RefObject<FaceFinder>;
    windowOpen: boolean;
}

interface FaceFinderState extends LivelitState {
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
            imagePath: './img/seattle-times.jpg',
            detectedRegions: [],
            windowOpen: props.windowOpen,
            abortOnResumingExecution: false,
            valueSet: props.valueSet
        }
        this.photoButton = <div onClick={this.takePhoto.bind(this)}
                                className="button" id="take-photo">
                               Take Photo
                           </div>
        this.acceptButton = <div className="button apply-btn" id="accept-faces">
                                Accept
                            </div>
    }

    async takePhoto() {
        let imageUrl = await this.camera?.takePhoto();
        if (imageUrl) {
            this.setState((prev: FaceFinderProps) => {
                return {
                    imageTaken: true,
                    imagePath: imageUrl
                };
            }, this.detectRegions);
        }
    }

    expand() : string {
        let s = `async function ${this.functionName}(camera) {`;
        s += `let ff = PROGRAM_PANE.getLivelitWithName(\'$faceFinder\');`;
        s += `ff.camera = camera;`;
        s += `await ff.openWindow();`;
        s += `let regions = await ff.acceptDetectedRegions();`;
        s += `await ff.closeWindow();`;
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
            regions.forEach(r => {
                if (this.camera && this.camera.tabletop) {
                    r.drawOnTabletop(this.camera.tabletop);
                }
            });
            let prevRegions : pair.Region[];
            this.setState((prevState: FaceFinderState) => {
                prevRegions = prevState.detectedRegions;
                return {
                    detectedRegions: regions
                }
            }, () => prevRegions.forEach(r => {
                r.clearFromTabletop();
            }));
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
            else {
                console.warn('FaceFinder: accepting no faces.');
                resolve([]);
            }
        });
    }

    renderResults() {
        let resultLis : JSX.Element[] = this.state.detectedRegions
            .map((r, idx) => {
           return <li key={idx}>{r.toString()}</li>
        })
        return resultLis;
    }

    renderValue() {
        let maybeGrayed = this.state.valueSet ? '' : 'grayed';
        let value = this.state.detectedRegions.length > 0
                        ? `Region[]([${this.state.detectedRegions}])`
                        : '?';
        return (
            <div className={`module-value ${maybeGrayed}`}
                 key={`${this.titleKey}-value`}>
                 { value }
            </div>
        );
    }

    renderContent() {
        let image = this.state.imageTaken
                        ? <img src={this.state.imagePath}/>
                        : <div></div>;
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        return <div className={`face-finder content ${maybeHidden}`}
                    key={this.contentKey.toString()}>
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

class ToolpathDirectManipulator extends LivelitWindow {
    constructor(props: LivelitProps) {
        super(props);
    }

    TODO_directManipulation() {
        console.warn('Not yet implemented.');

        /**
        // Check hit for each preview (box + mini toolpath)
        Object.values(this.toolpathCollection.thumbnailCollection)
        .forEach((thumbnail) => {
            let hitResult = thumbnail.hitTest(event.point, hitOptions);
            if (hitResult) {
                this.loadToolpathByName(thumbnail.pairName);
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
            else {
                toolpath.selected = false;
            }
        });
        */
    }
}

interface CamCompilerProps extends LivelitProps {
    ref: React.RefObject<CamCompiler>;
    plRef: React.RefObject<ProgramLine>;
    valueSet: boolean;
    windowOpen: boolean;
}

interface CamCompilerState extends LivelitState {
    machine: pair.Machine;
    geometry?: pair.Geometry;
}

class CamCompiler extends LivelitWindow {
    state: CamCompilerState;

    constructor(props: CamCompilerProps) {
        super(props);
        this.titleText = 'CAM Compiler';
        this.functionName = '$camCompiler';
        this.applyButton = <div className="button apply-btn"
                                id="done-cam-compiler">
                                Done
                            </div>
        this.state = {
            machine: new pair.Machine('TEMP'),
            geometry: undefined,
            windowOpen: props.windowOpen,
            abortOnResumingExecution: false,
            valueSet: props.valueSet
        };
    }

    async setArguments(machine: pair.Machine, geometry: pair.Geometry) {
        return new Promise<void>((resolve) => {
            this.setState(_ => {
                return {
                    machine: machine,
                    geometry: geometry
                };
            }, resolve);
        });
    }

    expand() : string {
        let s = `async function ${this.functionName}(machine, geometry) {`;
        s += `let td = PROGRAM_PANE.getLivelitWithName(\'${this.functionName}\');`;
        s += `await td.setArguments(machine, geometry);`;
        s += `await td.openWindow();`;
        s += `let toolpath = await td.acceptToolpath();`;
        s += `await td.closeWindow();`;
        s += `return toolpath;`;
        s += `}`;
        return s;
    }

    async acceptToolpath() : Promise<pair.Toolpath>{
        return new Promise<pair.Toolpath>((resolve, reject) => {
            const doneDom = document.getElementById('done-cam-compiler');
            if (doneDom) {
                doneDom.addEventListener('click', (event) => {
                    if (!this.state.geometry) {
                        reject('CamCompiler: geometry not set.');
                    }
                    else {
                        this.state.machine
                            .compileGeometryToToolpath(this.state.geometry)
                            .then((toolpath) => {
                                resolve(toolpath);
                            });
                        }
                });
            }
        });
    }

    renderContent() {
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        return (
            <div className={`cam-compiler content ${maybeHidden}`}>
                No options for now, just press done.
                { this.applyButton }
            </div>
        );
    }
}

interface ToolpathVisualizerProps extends LivelitProps {
    ref: React.RefObject<ToolpathVisualizer>;
    plRef: React.RefObject<ProgramLine>;
    valueSet: boolean;
    windowOpen: boolean;
}

interface ToolpathVisualizerState extends LivelitState {
    machine: pair.Machine;
    toolpaths: pair.Toolpath[];
    tabletop?: pair.Tabletop;
    selectedToolpathUrl: string;
    selectedInstIndex: number;
}

class ToolpathVisualizer extends LivelitWindow {
    state: ToolpathVisualizerState;

    constructor(props: ToolpathVisualizerProps) {
        super(props);
        this.titleText = 'Toolpath Visualizer';
        this.functionName = '$toolpathVisualizer';
        this.applyButton = <div className="button apply-btn"
                                id="done-toolpath-visualizer">
                                Done
                            </div>
        this.state = {
            machine: new pair.Machine('TEMP'),
            toolpaths: [],
            tabletop: undefined,
            windowOpen: props.windowOpen,
            abortOnResumingExecution: false,
            valueSet: props.valueSet,
            selectedToolpathUrl: '',
            selectedInstIndex: -1
        };
    }

    async setArguments(machine: pair.Machine,
                       toolpaths: pair.Toolpath[],
                       tabletop: pair.Tabletop) {
        return new Promise<void>((resolve) => {
            this.setState(_ => {
                return {
                    machine: machine,
                    toolpaths: toolpaths,
                    tabletop: tabletop
                };
            }, resolve);
        });
    }

    expand() : string {
        let s = `async function ${this.functionName}(machine, toolpaths, tabletop) {`;
        s += `let td = PROGRAM_PANE.getLivelitWithName(\'${this.functionName}\');`;
        s += `await td.setArguments(machine, toolpaths, tabletop);`;
        s += `await td.openWindow();`;
        s += `await td.finishDeployment();`;
        s += `await td.closeWindow();`;
        s += `}`;
        return s;
    }

    async finishDeployment() : Promise<void>{
        return new Promise<void>((resolve) => {
            const doneDom = document.getElementById('done-toolpath-visualizer');
            if (doneDom) {
                doneDom.addEventListener('click', (event) => {
                    resolve();
                });
            }
        });
    }

    setSelectedToolpathUrl(url: string) {
        this.setState(_ => ({ selectedToolpathUrl: url }));
    }

    getSelectedToolpath() : pair.Toolpath | undefined {
        let tp = this.state.toolpaths.find(tp => {
            return tp.geometryUrl === this.state.selectedToolpathUrl;
        });
        return tp;
    }

    basicViz(toolpath: pair.Toolpath) {
        if (!this.state.tabletop) {
            throw new Error('Cannot visualize without tabletop linked.');
        }
        let vizPath = new paper.Path({
            strokeWidth: 1,
            strokeColor: new paper.Color(0x0000ff)
        });
        let getXyMmChangeFromABSteps = (aSteps: number, bSteps: number) => {
            let x = 0.5 * (aSteps + bSteps);
            let y = -0.5 * (aSteps - bSteps);
            // TODO: read this from an EM instruction
            let stepsPerMm = 80;
            return new paper.Point(
                mm(x / stepsPerMm),
                mm(y / stepsPerMm)
            );
        };
        let currentPosition = new paper.Point(
            this.state.tabletop.workEnvelope.anchor.x,
            this.state.tabletop.workEnvelope.anchor.y
        );
        let newPosition : paper.Point;
        vizPath.segments.push(new paper.Segment(currentPosition));
        let tokens, opcode, duration, aSteps, bSteps, xyChange;
        toolpath.instructions.forEach((instruction) => {
            tokens = instruction.split(',');
            opcode = tokens[0];
            if (opcode === 'SM') {
                aSteps = parseInt(tokens[2]);
                bSteps = parseInt(tokens[3]);
                xyChange = getXyMmChangeFromABSteps(aSteps, bSteps);
                newPosition = currentPosition.add(xyChange);
                vizPath.segments.push(new paper.Segment(newPosition));
                currentPosition = newPosition;
            }
        });
        let wrapperGroup = new paper.Group([vizPath]);
        return wrapperGroup;
    }

    // TODO: is there a way to do this without copy paste? Maybe not because
    // each must be its own standalone interpreter
    colorViz(toolpath: pair.Toolpath) {
        if (!this.state.tabletop) {
            throw new Error('Cannot visualize without tabletop linked.');
        }
        let vizGroup = new paper.Group();
        let getXyMmChangeFromABSteps = (aSteps: number, bSteps: number) => {
            let x = 0.5 * (aSteps + bSteps);
            let y = -0.5 * (aSteps - bSteps);
            // TODO: read this from an EM instruction
            let stepsPerMm = 80;
            return new paper.Point(
                mm(x / stepsPerMm),
                mm(y / stepsPerMm)
            );
        };
        let currentPosition = new paper.Point(
            this.state.tabletop.workEnvelope.anchor.x,
            this.state.tabletop.workEnvelope.anchor.y
        );
        type countColor = 'red' | 'green';
        let currentColor : countColor = 'green';
        let newPosition : paper.Point;
        // vizPath.segments.push(new paper.Segment(currentPosition));
        let tokens, opcode, duration, aSteps, bSteps, xyChange;
        toolpath.instructions.forEach((instruction) => {
            tokens = instruction.split(',');
            opcode = tokens[0];
            if (opcode === 'SM') {
                aSteps = parseInt(tokens[2]);
                bSteps = parseInt(tokens[3]);
                xyChange = getXyMmChangeFromABSteps(aSteps, bSteps);
                newPosition = currentPosition.add(xyChange);
                let seg0 = new paper.Segment(currentPosition);
                let seg1 = new paper.Segment(newPosition);
                let newPath = new paper.Path({
                    segments: [ seg0, seg1 ],
                    strokeWidth: 1,
                    strokeColor: new paper.Color(currentColor)
                });
                vizGroup.addChild(newPath);
                currentPosition = newPosition;
            }
            if (opcode === 'SP') {
                currentColor = currentColor === 'red'
                               ? 'green' : 'red';
            }
        });
        return vizGroup;
    }

    toggleViz(event: React.ChangeEvent<HTMLInputElement>) {
        let vizName = event.target.dataset.vizName;
        let checked = event.target.checked;
        if (!this.state.tabletop
            || this.state.toolpaths.length === 0
            || !vizName) {
            throw new Error('Tabletop, visualization DOM name, or '
                            + 'toolpath not set for visualization.');
        }
        if (!checked) {
            this.state.tabletop.removeVizWithName(vizName);
            return;
        }
        // TODO: in this class, support toolpath selection rather than
        // selecting URLs.
        let selectedToolpath = this.state.toolpaths[0];
        let visualization : paper.Group;
        if (vizName === 'plainMovementLines') {
            visualization = this.basicViz(selectedToolpath)
        }
        else if (vizName === 'coloredMovementLines') {
            visualization = this.colorViz(selectedToolpath)
        }
        else {
            return;
        }
        this.state.tabletop.addVizWithName(visualization, vizName);
    }

    renderToolpathThumbnails() {
        let elements = this.state.toolpaths.map((tp, idx) => {
            let url = tp.geometryUrl;
            let maybeHighlight = this.state.selectedToolpathUrl === url
                                    ? 'gallery-highlight' : '';
            return <div className={`gallery-item ${maybeHighlight}`}
                        data-geometry-name={name}
                        onClick={this.setSelectedToolpathUrl.bind(this, url)}
                        key={idx.toString()}>
                        <img src={url}
                             className="gallery-image"/>
                   </div>
        });
        return <div className="gallery">{elements}</div>;
    }

    renderSelectedToolpathInstructions() {
        let tp = this.getSelectedToolpath();
        let instElements : JSX.Element[] = [];
        if (tp) {
            instElements = tp.instructions.map((inst, idx) => {
                let maybeHighlight = this.state.selectedInstIndex === idx
                                     ? 'highlight' : '';
                return (
                    <div className={`inst-list-item ${maybeHighlight}`}
                         key={idx}>{inst}</div>
                );
            });
        }
        return (
            <div id="inst-list" className="boxed-list">{ instElements }</div>
        );
    }

    renderMachineParams() {
        return (
            <div id="machine-param-list" className="boxed-list">
                <div className="machine-param">
                <span className="param-key">Pen Height</span>
                <span className="param-value">33mm</span>
                </div>
            </div>
        );
    }

    renderVizInterpreters() {
        return (
            <div id="viz-interpreter-list" className="boxed-list">
                <div className="viz-interpreter-item">
                    <input type="checkbox"
                           data-viz-name="plainMovementLines"
                           onChange={this.toggleViz.bind(this)}/>
                    Plain movement lines
                </div>
                <div className="viz-interpreter-item">
                    <input type="checkbox"
                           data-viz-name="coloredMovementLines"
                           onChange={this.toggleViz.bind(this)}/>
                    Colored movement lines
                </div>
            </div>
        );
    }

    renderContent() {
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        return (
            <div className={`toolpath-visualizer content ${maybeHidden}`}
                 key={this.contentKey.toString()}>
                <div className="bold-text">Toolpaths</div>
                { this.renderToolpathThumbnails() }
                <div className="bold-text">
                    Machine Parameters
                    ({this.state.machine.machineName})
                </div>
                { this.renderMachineParams() }
                <div className="bold-text">Instructions</div>
                { this.renderSelectedToolpathInstructions() }
                <div className="bold-text">Visualization Interpreters</div>
                { this.renderVizInterpreters() }
                { this.applyButton }
           </div>
       );
    }
}

export { ProgramPane };
