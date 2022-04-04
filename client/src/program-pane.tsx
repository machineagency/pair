/** This file contains React components for:
 *  - The program pane
 *  - All module windows and functionality as described in the Omar et al.
 *    paper.
 *  - Props of Module Components represent that module's parameter.
 *  - State of Module Components represent any GUI input elements within
 *    the module window whose splices will be used to write the expansion.
 *  - Class Properties thereof represent the model that will eventually be
 *    returned by the module. Note that we cannot rely on React state for this
 *    because we need synchonicity.
 */

/// <reference path="perspective-transform.d.ts" />

import * as verso from './verso';
import { mm, px, ISA, GeometryFiletype } from './verso';
import { FormatUtil } from './format-util'
import { VisualizationInterpreters,
         InterpreterSignature } from './visualization-interpreters'
(window as any).mm = mm;
(window as any).px = px;

import { Editor, EditorState, ContentState } from 'draft-js';
import React from 'react';
import ReactDOM from 'react-dom';
import Paper from 'paper';
import * as THREE from 'three';

function RERUN() {
    let btn = document.getElementById('run-prog-btn');
    if (btn) {
        btn.click();
    }
}

const BASE_URL = '';

interface Props {};
interface State {}

class ProgramUtil {
    static textHasModuleCall(text: string) {
        const re = /\$\w+/;
        const maybeMatch = text.match(re);
        if (!maybeMatch) {
            return false;
        }
        const moduleName = maybeMatch[0].slice(1);
        const allModuleNames = [
            'geometryGallery',
            'pointPicker',
            'tabletopCalibrator',
            'cameraCalibrator',
            'faceFinder',
            'axidrawDriver',
            'toolpathVisualizer',
            'machineInitializer',
            'dispatcher',
            'miniCam',
            'display',
            'projector',
            'instructionBuilder',
            'arraySlicer',
        ];
        return allModuleNames.includes(moduleName);
    }

    static parseTextForModule(text: string,
                               moduleRef: React.RefObject<VersoModule>)
                               : JSX.Element | null {
        const re = /\$\w+/;
        const maybeMatch = text.match(re);
        if (!maybeMatch) {
            return null;
        }
        const moduleName = maybeMatch[0].slice(1);
        switch (moduleName) {
            case 'geometryGallery':
                const ggProps: GeometryGalleryProps = {
                    ref: moduleRef as React.RefObject<GeometryGallery>,
                    valueSet: false,
                    windowOpen: true,
                    key: text
                };
                return <GeometryGallery {...ggProps}>
                       </GeometryGallery>;
            case 'pointPicker':
                const ppProps: PointPickerProps = {
                    ref: moduleRef as React.RefObject<PointPicker>,
                    valueSet: false,
                    windowOpen: true,
                    key: text
                };
                return <PointPicker {...ppProps}>
                       </PointPicker>;
            case 'tabletopCalibrator':
                const tcProps: TabletopCalibratorProps = {
                    machine: undefined,
                    tabletop: undefined,
                    ref: moduleRef as React.RefObject<TabletopCalibrator>,
                    valueSet: false,
                    windowOpen: true,
                    key: text
                };
                return <TabletopCalibrator {...tcProps}>
                       </TabletopCalibrator>;
            case 'cameraCalibrator':
                const ccProps: CameraCalibratorProps = {
                    ref: moduleRef as React.RefObject<CameraCalibrator>,
                    valueSet: false,
                    windowOpen: false,
                    key: text
                }
                return <CameraCalibrator {...ccProps}></CameraCalibrator>;
            case 'faceFinder':
                const ffProps: FaceFinderProps = {
                    camera: undefined,
                    ref: moduleRef as React.RefObject<FaceFinder>,
                    valueSet: false,
                    windowOpen: true,
                    key: text
                };
                return <FaceFinder {...ffProps}>
                       </FaceFinder>;
            case 'axidrawDriver':
                const camProps: AxidrawDriverProps = {
                    ref: moduleRef as React.RefObject<AxidrawDriver>,
                    valueSet: false,
                    windowOpen: true,
                    key: text
                };
                return <AxidrawDriver {...camProps}>
                       </AxidrawDriver>
            case 'toolpathVisualizer':
                const tdProps: ToolpathVisualizerProps = {
                    ref: moduleRef as React.RefObject<ToolpathVisualizer>,
                    valueSet: false,
                    windowOpen: true,
                    key: text
                };
                return <ToolpathVisualizer {...tdProps}></ToolpathVisualizer>;
            case 'machineInitializer':
                const miProps: MachineInitializerProps = {
                    ref: moduleRef as React.RefObject<MachineInitializer>,
                    valueSet: false,
                    windowOpen: true,
                    key: text
                };
                return <MachineInitializer {...miProps}></MachineInitializer>;
            case 'dispatcher':
                const dProps: DispatcherProps = {
                    ref: moduleRef as React.RefObject<Dispatcher>,
                    valueSet: false,
                    windowOpen: true,
                    key: text
                };
                return <Dispatcher {...dProps}></Dispatcher>;
            case 'miniCam':
                const mcProps: MiniCamProps = {
                    ref: moduleRef as React.RefObject<MiniCam>,
                    valueSet: false,
                    windowOpen: true,
                    key: text
                };
                return <MiniCam {...mcProps}></MiniCam>;
            case 'display':
                const displayProps: DisplayProps = {
                    ref: moduleRef as React.RefObject<Display>,
                    valueSet: false,
                    windowOpen: true,
                    key: text
                };
                return <Display {...displayProps}></Display>;
            case 'projector':
                const projectorProps: ProjectorProps = {
                    ref: moduleRef as React.RefObject<Projector>,
                    valueSet: false,
                    windowOpen: true,
                    key: text
                };
                return <Projector {...projectorProps}></Projector>;
            case 'instructionBuilder':
                const instructionBuilderProps: InstructionBuilderProps = {
                    ref: moduleRef as React.RefObject<InstructionBuilder>,
                    valueSet: false,
                    windowOpen: true,
                    key: text
                };
                return <InstructionBuilder {...instructionBuilderProps}></InstructionBuilder>;
            case 'arraySlicer':
                const arraySlicerProps: ArraySlicerProps = {
                    ref: moduleRef as React.RefObject<ArraySlicer>,
                    valueSet: false,
                    windowOpen: true,
                    key: text
                };
                return <ArraySlicer {...arraySlicerProps}></ArraySlicer>;
            default:
                return null;
        }
    }
}

interface ProgramPaneProps {
    loadedWorkflowText: string;
};
interface ProgramPaneState {
    cleanWorkflow: string[];
    loadedWorkflowText: string;
};
class ProgramPane extends React.Component<ProgramPaneProps, ProgramPaneState> {
    moduleRefs: React.RefObject<VersoModule>[];
    programLinesRef: React.RefObject<HTMLDivElement>;
    updateAndRerunTimeout: number;

    constructor(props: ProgramPaneProps) {
        super(props);
        this.moduleRefs = [];
        let preloadedContent = ContentState.createFromText(props.loadedWorkflowText);
        this.state = {
            loadedWorkflowText: '',
            cleanWorkflow: [],
        };
        this.updateAndRerunTimeout = 0;
        this.programLinesRef = React.createRef<HTMLDivElement>();
    }

    static getDerivedStateFromProps(nextProps: ProgramPaneProps,
                                    prevState: ProgramPaneState) {
        let propsHasWf = nextProps.loadedWorkflowText.length > 0;
        let currentWfEmpty = prevState.cleanWorkflow.length === 0;
        let propsWfChanged = nextProps.loadedWorkflowText
                                !== prevState.loadedWorkflowText;
        if (propsHasWf && (currentWfEmpty || propsWfChanged)) {
            return {
                cleanWorkflow: nextProps.loadedWorkflowText.split('\n'),
                loadedWorkflowText: nextProps.loadedWorkflowText
            };
        }
        else {
            return prevState;
        }
    }

    componentDidUpdate() {
        RERUN();
    }

    private __getModules() : VersoModule[] {
        let modules : VersoModule[] = [];
        let maybeModules = this.moduleRefs.map((ref) => {
            return ref.current;
        });
        let nonNullMods = maybeModules.filter((mod) : mod is VersoModule => {
            return mod !== null;
        });
        return nonNullMods;
    }

    getModuleWithName(functionName: string) : State {
        let modules = this.__getModules();
        let moduleWindow = modules.find((mod) => {
            return mod.functionName === functionName;
        });
        return moduleWindow ? moduleWindow : {};
    }

    gatherModulesAsFunctionDeclarations() : string {
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
        const extractProgramText = () => {
            let programTextDoms = document.getElementsByClassName('program-line');
            let lines = Array.from(programTextDoms).map((dom) => {
                return (dom as HTMLDivElement).innerText;
            });
            return lines.join('\n');
        };
        this.clearWindowPaperObject();
        const PROGRAM_PANE = this;
        let innerProgText = extractProgramText();
        let moduleFunctionDeclarations = this.gatherModulesAsFunctionDeclarations();
        let progText  = `${moduleFunctionDeclarations}`;
        progText += `\n(async function() {`;
        progText += `${innerProgText}`;
        progText += `})();`;
        try {
            eval(progText);
        }
        catch (e) {
            console.error(e);
        }
    }

    private clearWindowPaperObject() {
        Paper.project.clear();
    }

    handleKeyUp(event: React.KeyboardEvent<HTMLDivElement>) {
        this.fireRerunHandler(event);

        // Get the current line DOM.
        let selection = window.getSelection();
        if (!selection) { return; }
        let lineNumber = this.getLineNumberFromSelection(selection);
        if (lineNumber < 0) { return; }
        let lineDom = this.findLineWithIndex(lineNumber - 1);
        if (!lineDom) { return; }
        let text = lineDom.innerText;

        // Gather info on what we should do.
        let hasModuleCall = ProgramUtil.textHasModuleCall(text);
        let nextDom = lineDom.nextElementSibling;
        let hasModuleNext = nextDom && nextDom.className === 'module-window';

        // CASE: need to inflate a module for a new call, OR
        // CASE: need to remove a module due to loss of call.
        // It turns out we just update in the same way each time.
        if ((hasModuleCall && !hasModuleNext)
            || (!hasModuleCall && hasModuleNext)) {
            let newCleanWorkflow = this.state.cleanWorkflow.slice();
            let lineIndex = lineNumber - 1;
            newCleanWorkflow[lineIndex] = text;

            this.setState({ cleanWorkflow: newCleanWorkflow }, () => {
                let newLineDom = this.findLineWithIndex(lineIndex);
                if (!selection || !newLineDom) { return; }
                this.setCursorToProgramLine(selection, newLineDom);
            });
        }
    }

    private getLineNumberFromSelection(sel: Selection) {
        let anchorNode = sel.anchorNode as HTMLDivElement | undefined;
        if (!anchorNode) { return -1; }
        let plDom = anchorNode.nodeType === Node.TEXT_NODE
                    ? anchorNode.parentElement : anchorNode;
        if (!plDom) { return -1; }
        let rawLineNumber = plDom.dataset.lineNumber;
        if (!rawLineNumber) { return -1; }
        let lineNumber = parseInt(rawLineNumber);
        if (isNaN(lineNumber) || lineNumber < 1) { return -1; }
        return lineNumber;
    }

    private findLineWithIndex(lineIndex: number) {
        let plDoms = Array.from(document.getElementsByClassName(
                        'program-line')) as HTMLDivElement[];
        let newLineDom = plDoms.find((plDom) => {
            let rawLineNumber = plDom.dataset.lineNumber;
            if (!rawLineNumber) { return false; }
            let plIdx = parseInt(rawLineNumber) - 1;
            if (isNaN(plIdx) || plIdx < 1) {
                return false;
            }
            return plIdx === lineIndex;
        });
        return newLineDom;
    }

    private setCursorToProgramLine(sel: Selection, plDom: HTMLDivElement) {
        let range = document.createRange();
        // Not really sure why but 1 is the magic number since I guess offset
        // isn't by text in this case?
        let offset = 1;
        range.setStart(plDom, offset);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    }

    private filterEmptyLinesInWorkflow(deletedLineIndex: number) {
        let existingWorkflow = this.state.cleanWorkflow.slice();
        let newCleanWorkflow = existingWorkflow.filter((line) => {
            let trimmedLine = line.trim();
            return trimmedLine.length > 0;
        });
        // Get the previous line dom, to which we will set the cursor,
        // BEFORE we set state and cause rerender.
        let selection = window.getSelection();
        if (!selection) { return; }
        let index = deletedLineIndex === 0 ? 0 : deletedLineIndex - 1;
        let prevLineDom = this.findLineWithIndex(index);
        this.setState({ cleanWorkflow: newCleanWorkflow }, () => {
            if (!selection || !prevLineDom) { return; }
            this.setCursorToProgramLine(selection, prevLineDom);
        });
    }

    handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
        const backspace = 8;
        const tabKey = 9;
        const carriageReturn = 13;
        if (event.keyCode === carriageReturn) {
            // CASE: pressing CR adds a new line (for now, without splitting
            // the current line).
            event.preventDefault();
            let selection = window.getSelection();
            if (!selection) { return; }
            let lineNumber = this.getLineNumberFromSelection(selection);
            if (lineNumber < 0) { return; }
            let lineIndex = lineNumber;
            let newCleanWorkflow = this.state.cleanWorkflow.slice();
            let blankLine = ' ';
            newCleanWorkflow.splice(lineIndex, 0, blankLine);
            this.setState({ cleanWorkflow: newCleanWorkflow }, () => {
                let newLineDom = this.findLineWithIndex(lineIndex);
                if (!selection || !newLineDom) { return; }
                this.setCursorToProgramLine(selection, newLineDom);
            });
        }
        else if (event.keyCode === backspace) {
            // CASE: pressing backspace on empty line deletes line.
            let selection = window.getSelection();
            if (!selection) { return; }
            let lineNumber = this.getLineNumberFromSelection(selection);
            if (lineNumber < 0) { return; }
            let lineIndex = lineNumber - 1;
            let thisLine = this.findLineWithIndex(lineIndex);
            if (!thisLine) { return; }
            if (thisLine.innerText.trim() === '') {
                event.preventDefault();
                // FIXME: cursor placement not working yet
                this.filterEmptyLinesInWorkflow(lineIndex);
            }
        }
        else if (event.keyCode === tabKey) {
            this.handleTabKeypress(event);
        }
    }

    highlightSyntax() {
        // FIXME: broken
        let textDom = this.programLinesRef.current;
        if (!textDom) { return; }
        const pos = FormatUtil.caret(textDom);
        FormatUtil.highlight(textDom);
        FormatUtil.setCaret(pos, textDom);
    }

    fireRerunHandler(event: React.KeyboardEvent<HTMLDivElement>) {
        const delay = 250;
        let textDom = this.programLinesRef.current;
        if (!textDom) { return; }
        let textSetByUser = textDom.innerText;
        let cursorPos = FormatUtil.caret(textDom);
        if (FormatUtil.isCharKeypress(event)) {
            clearTimeout(this.updateAndRerunTimeout);
            this.updateAndRerunTimeout = window.setTimeout(() => {
                RERUN();
            }, delay);
        }
    }

    gatherDirtyWorkflow() {
        let doms = Array.from(document
                .getElementsByClassName('program-line')) as HTMLDivElement[];
        let lines = doms.map(dom => dom.innerText);
        return lines.join('\n');
    }

    handleTabKeypress(event: React.KeyboardEvent<HTMLDivElement>) {
        let textDom = this.programLinesRef.current;
        if (!textDom) { return; }
        if (FormatUtil.isTabKeypress(event)) {
            FormatUtil.handleTabKeypress(event, textDom);
        }
    }

    renderLines() {
        console.log('renderlines');
        this.moduleRefs = [];
        let lines = this.state.cleanWorkflow
            .filter((line) => line.length > 0);
        let programLines = lines.map((lineText, lineIndex) => {
            let lineNumber = lineIndex + 1;
            let maybeModuleRef = React.createRef<VersoModule>();
            this.moduleRefs.push(maybeModuleRef);
            const livelitWindow = ProgramUtil.parseTextForModule(
                                    lineText, maybeModuleRef);
            let plAndMaybeLivelit = [
                 <div className="program-line"
                      key={lineNumber}
                      data-line-number={lineNumber}>
                     {lineText}
                 </div>
            ];
            if (livelitWindow) {
                plAndMaybeLivelit.push(livelitWindow);
            }
            return plAndMaybeLivelit;
        });
        return programLines;
    }

    render() {
        let programLines = this.renderLines();
        let pane = (
            <div id="program-pane">
                <div id="program-lines-and-controls">
                    <div id="program-lines"
                         contentEditable={true}
                         suppressContentEditableWarning={true}
                         spellCheck={false}
                         onKeyDown={this.handleKeyDown.bind(this)}
                         onKeyUp={this.handleKeyUp.bind(this)}
                         ref={this.programLinesRef}>
                        { programLines }
                    </div>
                    <div id="program-controls" className="hidden">
                        <div id="run-prog-btn"
                             className={`pc-btn pc-run}`}
                             onClick={this.runAllLines.bind(this)}>
                             Run
                        </div>
                    </div>
                </div>
            </div>
        );
        return pane;
    }
}

interface ModuleState {
    windowOpen: boolean;
    valueSet: boolean;
}
interface ModuleProps {
    /* Ref created in the parent that is a React "special" prop included here
     * such that the parent (e.g. ModulePane) has a reference to the component
     * to which this Ref has been passed as "ref." */
    ref: React.RefObject<VersoModule>;
    windowOpen: boolean;
    valueSet: boolean;
    key: string;
};

class VersoModule extends React.Component {
    titleText: string;
    functionName: string;
    moduleClassName: string;
    titleKey: number;
    contentKey: number;
    applyButton?: JSX.Element;
    props: ModuleProps;
    state: ModuleState;

    constructor(props: ModuleProps) {
        super(props);
        this.props = props;
        this.titleText = 'Module Window';
        this.functionName = '$module';
        this.moduleClassName = 'module-window';
        this.titleKey = 0;
        this.contentKey = 1;
        this.state = {
            windowOpen: props.windowOpen,
            valueSet: props.valueSet,
        }
    }

    expand() : string {
        return 'function moduleExpansion() { };';
    }

    async openWindow() {
        return this._setWindowOpenState(true);
    }

    async closeWindow() {
        return this._setWindowOpenState(false);
    }

    toggleWindow() {
        if (this.state.windowOpen) {
            this.closeWindow();
        }
        else {
            this.openWindow()
        }
    }

    async _setWindowOpenState(open: boolean) {
        return new Promise<void>((resolve) => {
            this.setState((prev: ModuleState) => {
                return { windowOpen: open };
            }, resolve);
        });
    };

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

    renderToggleButton() {
        return (
            <div className="toggle-window-btn"
                 onClick={this.toggleWindow.bind(this)}>
                { this.state.windowOpen ? 'close' : 'open' }
            </div>
        );
    }

    render() {
        return <div className={this.moduleClassName}
                    contentEditable={false}
                    key={this.moduleClassName}>
                    <div className="title-and-toggle-bar">
                        { this.renderTitle() }
                        { this.renderToggleButton() }
                    </div>
                    { this.renderValue() }
                    { this.renderContent() }
               </div>
    }
};

interface GeometryGalleryProps extends ModuleProps {
    ref: React.RefObject<GeometryGallery>;
    windowOpen: boolean;
};

interface GeometryGalleryState extends ModuleState {
    selectedUrl: string;
    imageNameUrlPairs: [string, string][];
};

class GeometryGallery extends VersoModule {
    state: GeometryGalleryState;

    constructor(props: GeometryGalleryProps) {
        super(props);
        this.titleText = 'Geometry Gallery';
        this.functionName = '$geometryGallery';
        this.state = {
            selectedUrl: '',
            imageNameUrlPairs: [],
            windowOpen: props.windowOpen,
            valueSet: props.valueSet
        };
    }

    async init() {
        return new Promise<void>((resolve, reject) => {
            if (this.state.imageNameUrlPairs.length) {
                // NOTE: Disable this early return if we cannot assume that
                // image/3d model files on the server remain static.
                resolve();
            }
            this.fetchGeometryNames()
                .then((imageNameUrlPairs: [string, string][]) => {
                    let maybeSavedName = this.loadSavedValue();
                    let fallbackSavedName = 'box.svg';
                    let savedName = maybeSavedName || fallbackSavedName;
                    let selectedUrl = '';
                    let valueSet = false;
                    if (maybeSavedName) {
                        selectedUrl = this.getUrlForGeometryName(savedName,
                                        imageNameUrlPairs);
                        valueSet = true;
                    }
                    this.setState(_ => ({ selectedUrl, imageNameUrlPairs, valueSet }),
                        resolve);
                });
        });
    }

    expand() : string {
        let s = `async function ${this.functionName}(tabletop) {`;
        s += `let gg = PROGRAM_PANE.getModuleWithName(\'${this.functionName}\');`;
        s += `await gg.init();`;
        s += `let geomUrl = gg.state.selectedUrl;`;
        s += `let geom = new verso.Geometry(tabletop);`;
        s += `let geomName = gg.getGeometryNameForUrl(geomUrl);`;
        s += `await geom.loadRemoteFile(geomName);`;
        s += `return geom;`;
        s += `}`;
        return s;
    }

    /**
     * Save the name of the geometry since URLs are volatile.
     */
    saveValue() {
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

    setSelectedGeometryUrlAndRerun(url: string) {
        this.setState((state: GeometryGalleryState) => {
            return {
                selectedUrl: url
            };
        }, () => {
            this.saveValue();
            RERUN();
        });
    }

    renderGalleryItem(name: string, url: string, itemNumber: number) {
        const maybeHighlight = this.state.selectedUrl === url
                               ? 'gallery-highlight' : '';
        return <div className={`gallery-item ${maybeHighlight}`}
                    data-geometry-name={name}
                    onClick={this.setSelectedGeometryUrlAndRerun.bind(this, url)}
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
        return <div className={`content ${maybeHidden}`}
                    key={this.contentKey.toString()}>
                    <div className="gallery">
                        { galleryItems }
                    </div>
               </div>
    }

    async fetchGeometryNames() : Promise<[string, string][]> {
        return new Promise<[string, string][]>(async (resolve) => {
            const namesUrl = `${BASE_URL}/geometries`;
            let namesRes = await fetch(namesUrl);
            if (namesRes.ok) {
                let namesJson = await namesRes.json();
                let names : string[] = namesJson.names;
                let fetchImageUrl = async (name: string) => {
                    let imageRes = await fetch(`${BASE_URL}/geometry/${name}`);
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

interface PointPickerProps extends ModuleProps {
    ref: React.RefObject<PointPicker>;
    windowOpen: boolean;
};

class PointPicker extends VersoModule {
    props: PointPickerProps;

    constructor(props: ModuleProps) {
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

interface TabletopCalibratorProps extends ModuleProps {
    machine: verso.Machine | undefined;
    tabletop: verso.Tabletop | undefined;
    ref: React.RefObject<TabletopCalibrator>;
    windowOpen: boolean;
};

interface TabletopCalibratorState extends ModuleState {
    homography?: Homography;
};

class TabletopCalibrator extends VersoModule {
    state: TabletopCalibratorState;
    props: TabletopCalibratorProps;
    tabletop?: verso.Tabletop;
    applyButton: JSX.Element;

    constructor(props: TabletopCalibratorProps) {
        super(props);
        this.titleText = 'Tabletop Calibrator';
        this.functionName = '$tabletopCalibrator';
        this.tabletop = undefined;
        this.props = props;
        let maybeSavedHomography = this.loadSavedValue();
        this.state = {
            windowOpen: props.windowOpen,
            homography: maybeSavedHomography,
            valueSet: !!maybeSavedHomography
        };
        this.applyButton = <div className="button apply-btn"
                                id="apply-tabletop-homography"
                                onClick={this.calculateAndSetHomography.bind(this)}>
                                Apply
                            </div>
    }

    private __expandHelper(machine: verso.Machine) {
        // @ts-ignore
        let tc: typeof this = PROGRAM_PANE.getModuleWithName(FUNCTION_NAME_PLACEHOLDER);
        let tabletop = new verso.Tabletop(machine);
        tc.tabletop = tabletop;
        if (tc.state.homography) {
            tc.tabletop.workEnvelope
                .setHomographyAndRedrawCorners(tc.state.homography);
        }
        // FIXME: remove the need to set this
        machine.tabletop = tabletop;
        return tabletop;
    }

    expand() : string {
        let fnString = this.__expandHelper.toString();
        fnString = fnString.replace('__expandHelper', this.functionName);
        fnString = fnString.replace('FUNCTION_NAME_PLACEHOLDER', `\'${this.functionName}\'`);
        fnString = 'async ' + fnString;
        return fnString;
    }

    drawBorder() {
        if (this.tabletop) {
            this.tabletop.machine.drawBorder();
        }
    }

    unlockCorners() {
        if (!this.tabletop) { return; }
        this.tabletop.toggleWorkEnvelopeCalibration();
    }

    calculateAndSetHomography() {
        if (!this.tabletop) { return; }
        let h = this.tabletop.calculateHomographyFromCalibration();
        this.setState(_ => {
            return {
                homography: h,
            }
        });
        this.saveValue().then(_ => RERUN());
    }

    saveValue() {
        return new Promise<void>((resolve, reject) => {
            if (this.tabletop) {
                let h = this.state.homography;
                if (!h) {
                    console.warn('TabletopCalibrator: Could not save homography.');
                    reject();
                }
                let hSerialized = JSON.stringify(h);
                localStorage.setItem(this.functionName, hSerialized);
                this.setState(_ => {
                    return {
                        valueSet: true
                    }
                }, resolve);
            }
            else {
                console.warn('TabletopCalibrator: Could not save homography.');
                reject();
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
            try {
                let revivedH = JSON.parse(coeffsStr) as RevivedHomography;
                // Hopefully no numerical errors here.
                let h = PerspT(revivedH.srcPts, revivedH.dstPts);
                return h;
            }
            catch (Error) {
                return undefined;
            }
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
                    homography: undefined,
                    valueSet: false
                }
            }, () => {
                RERUN();
                resolve();
            });
        });
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

    renderValue() {
        let grayedIffUnset = this.state.valueSet ? '' : 'grayed';
        let hiddenIffUnset = this.state.valueSet ? '' : 'hidden';
        let value = this.state.homography
                        ? this.state.homography.coeffs.toString()
                        : '?';
        let display = `Tabletop(WorkEnvelope(homography: `
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
                    { this.renderClearButton() }
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

interface CameraCalibratorProps extends ModuleProps {
    ref: React.RefObject<CameraCalibrator>;
    windowOpen: boolean;
}

interface CameraCalibratorState extends ModuleState {
    unwarpedImageUrl: string;
    warpedImageUrl: string;
    /* Make this H optional rather than initializing it as an identity
     * because we are having a lot of problems producing an identity. */
    extrinsicTransform?: Homography;
    selectedPoints: verso.Point[];
};

class CameraCalibrator extends VersoModule {
    props: ModuleProps;
    state: CameraCalibratorState;
    tabletop?: verso.Tabletop;
    camera: verso.Camera;
    applyButtonId: string;
    applyButton: JSX.Element;
    photoButtonId: string;
    photoButton: JSX.Element;

    constructor(props: CameraCalibratorProps) {
        super(props);
        this.props = props;
        this.camera = new verso.Camera();
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
            valueSet: !!maybeSavedExtrinsicTransform,
            selectedPoints: []
        };
    }

    setImageToTableScaling(camera: verso.Camera) {
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

    async acceptCameraWarp() : Promise<verso.Camera> {
        return new Promise<verso.Camera>((resolve) => {
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
            try {
                let revivedH = JSON.parse(coeffsStr) as RevivedHomography;
                // Hopefully no numerical errors here.
                let h = PerspT(revivedH.srcPts, revivedH.dstPts);
                return h;
            }
            catch (Error) {
                return undefined;
            }
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
        s += `let cc = PROGRAM_PANE.getModuleWithName(\'${this.functionName}\');`;
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
        if (!this.tabletop) { return; }
        this.tabletop.machine.drawBorder();
    }

    async takePhoto() {
        if (!this.camera) { return; }
        let imageUrl = await this.camera.takePhoto();
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
                    let url = `${BASE_URL}/camera/warpLastPhoto?coeffs=${h.coeffs}`
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
            const pt = new verso.Point(x, y);
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
                 { `Camera(extrinsicTransform: [${value}])` }
            </div>
        );
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

    renderContent() {
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        return <div className={`camera-calibrator content ${maybeHidden}`}
                    key={this.contentKey.toString()}>
                    { this.renderClearButton() }
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

interface FaceFinderProps extends ModuleProps {
    camera?: verso.Camera;
    ref: React.RefObject<FaceFinder>;
    windowOpen: boolean;
}

interface FaceFinderState extends ModuleState {
    imageTaken: boolean;
    imagePath: string;
    detectedRegions: verso.Region[];
}

class FaceFinder extends VersoModule {
    state: FaceFinderState;
    camera?: verso.Camera;
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
        if (!this.camera) { return; }
        let imageUrl = await this.camera.takePhoto();
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
        s += `let ff = PROGRAM_PANE.getModuleWithName(\'$faceFinder\');`;
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
            let prevRegions : verso.Region[];
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
        return new Promise<verso.Region[]>((resolve) => {
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

class ToolpathDirectManipulator extends VersoModule {
    constructor(props: ModuleProps) {
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
                this.loadToolpathByName(thumbnail.versoName);
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

interface AxidrawDriverProps extends ModuleProps {
    ref: React.RefObject<AxidrawDriver>;
    valueSet: boolean;
    windowOpen: boolean;
}

interface AxidrawDriverState extends ModuleState {
    currentDriverName?: DriverName;
    machine: verso.Machine;
    geometry?: verso.Geometry;
    toolpath?: verso.Toolpath;
}

type DriverName = 'Axidraw EBB'
    | 'Jasper\'s Wacky Slicer';
type CamIsaOutput = 'EBB' | 'g-Code';

interface SingleAxidrawDriver {
    name: DriverName;
    geometryInput: verso.GeometryFiletype;
    isaOutput: CamIsaOutput;
}

class AxidrawDriver extends VersoModule {
    state: AxidrawDriverState;
    drivers: SingleAxidrawDriver[];

    constructor(props: AxidrawDriverProps) {
        super(props);
        this.titleText = 'Axidraw Driver';
        this.functionName = '$axidrawDriver';
        this.drivers = [
            {
                name: 'Axidraw EBB',
                geometryInput: 'svg',
                isaOutput: 'EBB'
            }
        ];
        let maybeSavedAxidrawDriverName = this.loadSavedValue();
        let defaultDriverName: DriverName = 'Axidraw EBB';
        this.state = {
            currentDriverName: maybeSavedAxidrawDriverName || defaultDriverName,
            machine: new verso.Machine('TEMP'),
            geometry: undefined,
            toolpath: undefined,
            windowOpen: props.windowOpen,
            valueSet: !!maybeSavedAxidrawDriverName
        };
    }

    async setArguments(machine: verso.Machine, geometry: verso.Geometry) {
        return new Promise<void>((resolve) => {
            this.setState(_ => {
                return {
                    machine: machine,
                    geometry: geometry
                };
            }, () => {
                this.generateToolpathWithCurrentDriver()
                    .then((toolpath) => {
                        this.setState((prevState) => {
                            return { toolpath: toolpath }
                        }, resolve);
                     });
                });
            });
        }

    expand() : string {
        let s = `async function ${this.functionName}(machine, geometry) {`;
        s += `let cc = PROGRAM_PANE.getModuleWithName(\'${this.functionName}\');`;
        s += `let toolpath;`;
        s += `await cc.setArguments(machine, geometry);`;
        s += `cc.generateToolpathWithCurrentDriver();`;
        s += `toolpath = cc.state.toolpath;`;
        s += `return toolpath;`;
        s += `}`;
        return s;
    }

    saveValue() {
        return new Promise<void>((resolve) => {
            if (this.state.currentDriverName) {
                localStorage.setItem(this.functionName, this.state.currentDriverName);
                this.setState(_ => {
                    return {
                        valueSet: true
                    }
                }, resolve);
            };
        });
    }

    loadSavedValue() : DriverName | undefined {
        let compilerName = localStorage.getItem(this.functionName);
        if (compilerName) {
            // TODO: actually verify
            return compilerName as DriverName;
        };
        return undefined;
    }

    clearSavedValue() {
        return new Promise<void>((resolve) => {
            localStorage.removeItem(this.functionName);
            this.setState(_ => {
                return {
                    currentDriverName: undefined,
                    valueSet: false
                }
            }, resolve);
        });
    }

    async generateToolpathWithCurrentDriver(): Promise<verso.Toolpath> {
        // TODO: find the correct compiler to use, for now assume Axidraw.
        // return early if we cannot find an appropriate compiler
        // for the current machine.
        return new Promise<verso.Toolpath>((resolve, reject) => {
            let compiler = this.drivers.find(c => c.name
                === this.state.currentDriverName);
            if (!this.state.geometry) {
                reject('Geometry not set');
            }
            else if (!compiler) {
                reject(`Can't find a compiler named`
                    + ` ${this.state.currentDriverName}`);
            }
            else if (compiler.geometryInput !== this.state.geometry.filetype) {
                reject(`${this.state.currentDriverName} cannot compile`
                    + ` a geometry with filetype ${this.state.geometry.filetype}`);
            }
            else {
                this.state.machine
                    .compileGeometryToToolpath(this.state.geometry)
                    .then((toolpath) => resolve(toolpath));
            }
        });
    }

    async acceptToolpath() : Promise<verso.Toolpath>{
        return new Promise<verso.Toolpath>((resolve, reject) => {
            const doneDom = document.getElementById('done-cam-compiler');
            if (doneDom) {
                doneDom.addEventListener('click', (event) => {
                    if (this.state.toolpath) {
                        resolve(this.state.toolpath);
                    }
                });
            }
        });
    }

    setCurrentDriver(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        let compilerItemDom = event.target as HTMLDivElement;
        let compilerName = compilerItemDom.dataset.compilerName;
        if (compilerName) {
            this.setState((prevState) => {
                return { currentDriverName: compilerName };
            }, () => {
                this.generateToolpathWithCurrentDriver()
                    .then((toolpath) => {
                        this.setState((prevState) => {
                            return {
                                toolpath: toolpath
                            };
                        }, () => {
                            this.saveValue();
                            RERUN();
                        });
                });
            });
        }
    }

    // renderDrivers() {
    //     let compilerDoms = this.drivers.map((compiler: SingleAxidrawDriver,
    //                                            idx: number) => {
    //         let maybeGrayed = compiler.geometryInput !== this.state.geometry?.filetype
    //                             ? 'grayed' : '';
    //         let maybeHighlight = compiler.name === this.state.currentDriverName
    //                              && !maybeGrayed
    //                             ? 'highlight' : '';
    //         return (
    //             <div className={`cam-compiler-item ${maybeHighlight} ${maybeGrayed}`}
    //                  key={idx}
    //                  data-compiler-name={compiler.name}
    //                  onClick={this.setCurrentDriver.bind(this)}>
    //                 <span className="compiler-name param-key"
    //                       data-compiler-name={compiler.name}>
    //                      { compiler.name }
    //                 </span>
    //                 <span className="geometry-input param-value"
    //                       data-compiler-name={compiler.name}>
    //                      { compiler.geometryInput }
    //                 </span>
    //                 <span className="isa-output param-value"
    //                       data-compiler-name={compiler.name}>
    //                      { compiler.isaOutput }
    //                 </span>
    //             </div>
    //         );
    //     });
    //     return (
    //         <div id="cam-compiler-list" className="boxed-list">
    //             { compilerDoms }
    //         </div>
    //     );
    // }

    renderToolpathInstructions() {
        let instElements : JSX.Element[] = [];
        if (this.state.toolpath) {
            instElements = this.state.toolpath.instructions
                .map((inst, idx) => {
                return (
                    <div className={`inst-list-item`}
                         key={idx}>{inst}</div>
                );
            });
        }
        return (
            <div id="inst-list" className="boxed-list">{ instElements }</div>
        );
    }

    renderValue() {
        let grayedIffUnset = this.state.valueSet ? '' : 'grayed';
        let hiddenIffUnset = this.state.valueSet ? '' : 'hidden';
        let display = `${this.state.currentDriverName}`;
        return (
            <div className={`module-value ${grayedIffUnset}`}
                 key={`${this.titleKey}-value`}>
                 { display }
            </div>
        );
    }

    renderContent() {
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        return (
            <div className={`cam-compiler content ${maybeHidden}`}>
                { this.renderToolpathInstructions() }
            </div>
        );
    }
}

interface ToolpathVisualizerProps extends ModuleProps {
    ref: React.RefObject<ToolpathVisualizer>;
    valueSet: boolean;
    windowOpen: boolean;
}

interface ToolpathVisualizerState extends ModuleState {
    machine: verso.Machine;
    toolpaths: verso.Toolpath[];
    visualizationSpace?: verso.VisualizationSpace;
    currentInterpreterId: number;
    selectedInstIndex: number;
}

interface VisualizerInterpreter {
    name: string;
    description: string;
    isa: ISA;
    implementation: InterpreterSignature;
    id: number;
}

class ToolpathVisualizer extends VersoModule {
    state: ToolpathVisualizerState;
    interpreters: VisualizerInterpreter[];
    vizSpaceDomRef: React.RefObject<HTMLDivElement>;
    vizSpaceCamera?: THREE.Camera;

    constructor(props: ToolpathVisualizerProps) {
        super(props);
        this.titleText = 'Toolpath Visualizer';
        this.functionName = '$toolpathVisualizer';
        // TODO: move the interpreter methods somewhere else where we can declare
        // a type and also generate this.interpreters programatically.
        this.vizSpaceDomRef = React.createRef<HTMLDivElement>();
        this.interpreters = [
            {
                name: 'Basic Lines (G-code)',
                description: 'All movement lines.',
                isa: 'ebb',
                implementation: VisualizationInterpreters.ebbBasicViz,
                id: 0
            },
            {
                name: 'Colored Travel vs Draw (EBB)',
                description: 'Travel and plot lines encoded by color.',
                isa: 'ebb',
                implementation: VisualizationInterpreters.ebbColorViz,
                id: 1
            },
            {
                name: 'Velocity as Thickness (EBB)',
                description: 'Movement lines with thickness proportional to'
                             + ' velocity.',
                isa: 'ebb',
                implementation: VisualizationInterpreters.ebbVelocityThicknessViz,
                id: 2
            },
            {
                name: 'Colored Travel vs Draw (G-code)',
                description: 'Travel and plot lines encoded by color.',
                isa: 'gcode',
                implementation: VisualizationInterpreters.gcodeColorViz,
                id: 3
            }
        ];
        let maybeSavedInterpreterName = this.loadSavedValue();
        this.vizSpaceCamera = undefined;
        this.state = {
            machine: new verso.Machine('TEMP'),
            toolpaths: [],
            visualizationSpace: undefined,
            currentInterpreterId: maybeSavedInterpreterName
                                    || 0,
            windowOpen: props.windowOpen,
            valueSet: !!maybeSavedInterpreterName,
            selectedInstIndex: -1
        };
    }

    get currentInterpreter() {
        return this.interpreters.find(i => i.id === this.state.currentInterpreterId);
    }

    async setArguments(machine: verso.Machine,
                       toolpaths: verso.Toolpath[]) {
        return new Promise<void>((resolve) => {
            this.setState(_ => {
                return {
                    machine: machine,
                    toolpaths: toolpaths,
                    visualizationSpace: new verso.VisualizationSpace(machine)
                };
            }, resolve);
        });
    }

    saveValue() {
        localStorage.setItem(this.functionName,
                             this.state.currentInterpreterId.toString());
        this.setState((prevState) => ({ valueSet: true }));
    }

    loadSavedValue() {
        let maybeId = localStorage.getItem(this.functionName);
        if (maybeId) {
            return parseInt(maybeId);
        }
    }

    setInterpreterFromClick (event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        let interpreterItemDom = event.target as HTMLDivElement;
        let interpreterId = interpreterItemDom.dataset.interpreterId;
        if (!interpreterId || isNaN(parseInt(interpreterId))) {
            return;
        }
        let id = parseInt(interpreterId);
        this.setState(_ => ({ currentInterpreterId: id }), () => {
            // After setting the interpreter, we need to re-run and let the
            // rendering be handled in the expand function rather than do
            // re-rendering here, because we need the new vizSpace returned
            // from the function to propagate down the program.
            RERUN();
        });
    }

    renderWithInterpreter(interpreterId: number) {
        if (!this.state.visualizationSpace) {
            throw Error('Cannot set interpreter without viz space.');
        }
        this.state.visualizationSpace.removeAllViz();
        let interpreter = this.currentInterpreter;
        this.state.toolpaths.forEach((toolpath) => {
            if (!interpreter) { throw new Error(); }
            let vizGroup = interpreter.implementation(toolpath);
            if (!this.state.visualizationSpace) { return; }
            this.state.visualizationSpace.addVizWithName(vizGroup, interpreter.name);
        });
        this.setState((prevState) => {
            return {
                currentInterpreterId: interpreterId
            };
        }, () => this.saveValue());
    }

    componentDidUpdate() {
        let maybeVizSpaceDom = this.vizSpaceDomRef.current;
        if (maybeVizSpaceDom && maybeVizSpaceDom.children.length > 1) {
            let oldCanvas = maybeVizSpaceDom.children.item(0);
            if (oldCanvas) {
                oldCanvas.remove();
            }
        }
    }

    private __expandHelper(machine: verso.Machine, toolpaths: verso.Toolpath[]) {
        if (!toolpaths.length) {
            console.error('Dispatcher needs an array of toolpaths.');
            return;
        }
        // @ts-ignore
        let tv: typeof this = PROGRAM_PANE.getModuleWithName(FUNCTION_NAME_PLACEHOLDER);
        return new Promise<verso.VisualizationSpace>((resolve, reject) => {
            tv.setArguments(machine, toolpaths).then(_ => {
                tv.populateVizSpace().then(vs => resolve(vs))
            });
        });
    }

    private async populateVizSpace() {
        return new Promise<verso.VisualizationSpace>((resolve, reject) => {
            if (!this.state.visualizationSpace) {
                reject();
                return;
            }
            this.renderWithInterpreter(this.state.currentInterpreterId);
            resolve(this.state.visualizationSpace);
        });
    }

    expand() : string {
        let fnString = this.__expandHelper.toString();
        fnString = fnString.replace('__expandHelper', this.functionName);
        fnString = fnString.replace('FUNCTION_NAME_PLACEHOLDER', `\'${this.functionName}\'`);
        fnString = 'async ' + fnString;
        return fnString;
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
        let interpreterDoms = this.interpreters
                                  .map((interpreter: VisualizerInterpreter,
                                        idx: number) => {
            let maybeHighlight = interpreter.id === this.state.currentInterpreterId
                                ? 'highlight' : '';
            return (
                <div className={`viz-interpreter-item ${maybeHighlight}`}
                     key={idx}
                     data-interpreter-id={interpreter.id}
                     onClick={this.setInterpreterFromClick.bind(this)}>
                    <span className="interpreter-name param-key"
                          data-interpreter-id={interpreter.id}>
                         { interpreter.name }
                    </span>
                    <span className="geometry-input param-value"
                          data-interpreter-id={interpreter.id}>
                         { interpreter.description }
                    </span>
                </div>
            );
        });
        return (
            <div id="cam-compiler-list" className="boxed-list">
                { interpreterDoms }
            </div>
        );
    }

    renderImplementation() {
        let interpreter = this.currentInterpreter;
        let functionText = interpreter ? interpreter.implementation.toString()
                                       : '';
        let demangleRe = /three__WEBPACK_IMPORTED_MODULE_2__\["(\w+)"\]/g;
        let varRe = /var/g;
        let demangledText = functionText.replace(demangleRe, 'THREE.$1');
        demangledText = demangledText.replace(varRe, 'let');
        return (
            <pre id="viz-implementation-box" className="code-box"><code>
                {demangledText}
            </code></pre>
        );
    }

    renderValue() {
        let grayedIffUnset = this.state.valueSet ? '' : 'grayed';
        let hiddenIffUnset = this.state.valueSet ? '' : 'hidden';
        // TODO: have set visualizations modify state and the render... or not
        let interpreterName = (this.currentInterpreter && this.currentInterpreter.name) || 'Unknown';
        let display = `Interpreter(${interpreterName})`;
        return (
            <div className={`module-value ${grayedIffUnset}`}
                 key={`${this.titleKey}-value`}>
                 { display }
            </div>
        );
    }

    renderContent() {
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        return (
            <div className={`toolpath-visualizer content ${maybeHidden}`}
                 key={this.contentKey.toString()}>
                <div id="visualization-space-container">
                    <div id="visualization-space"
                         ref={this.vizSpaceDomRef}></div>
                </div>
                <div className="bold-text">Toolpath Stylesheets</div>
                { this.renderVizInterpreters() }
                <div className="bold-text">Current TSS Implementation</div>
                { this.renderImplementation() }
           </div>
       );
    }
}

interface MachineInitializerProps extends ModuleProps {
    ref: React.RefObject<MachineInitializer>;
};

interface MachineInitializerState extends ModuleState {
    initialized: boolean;
    connected: boolean;
    axesHomed: verso.Axis[];
    portPaths: string[];
    selectedPortPathIndex: number;
    port?: verso.Port;
};

class MachineInitializer extends VersoModule {
    props: MachineInitializerProps;
    state: MachineInitializerState;

    constructor(props: MachineInitializerProps) {
        super(props);
        this.titleText = 'Machine Initializer';
        this.functionName = '$machineInitializer';
        this.props = props;
        this.state = {
            windowOpen: props.windowOpen,
            valueSet: false,
            initialized: false,
            connected: false,
            axesHomed: [],
            portPaths: [],
            selectedPortPathIndex: 0
        };
        this.fetchPortPaths();
        // TODO: check if machine port is actually open and homed, so we don't
        // have to do the whole thing over again if it is.
    }

    get selectedPortPath() {
        if (this.state.selectedPortPathIndex >= this.state.portPaths.length) {
            return undefined;
        }
        return this.state.portPaths[this.state.selectedPortPathIndex];
    }

    fetchPortPaths() {
        let url = `${BASE_URL}/portPaths`;
        fetch(url).then((response) => {
            if (response.ok) {
                return response.json();
            }
            else {
                throw new Error();
            }
        }).then((pathsJson) => {
            let pathObjs = pathsJson.paths;
            let paths: string[];
            if (!pathObjs) {
                paths = [];
            }
            else {
                paths = pathObjs.map((obj: any) => obj.path);
            }
            this.setState((prevState) => ({ portPaths: paths }));
        });
    };

    expand() : string {
        let s = `async function ${this.functionName}(machine) {`;
        s += `let mi = PROGRAM_PANE.getModuleWithName(\'${this.functionName}\');`;
        s += `if (mi.state.initialized) {`;
        s += `machine.initialized = true;`;
        s += `machine.port = mi.state.port;`;
        s += `}`;
        s += `return machine;`;
        s += `}`;
        return s;
    }

    saveValue() {
        return new Promise<void>((resolve) => {
            // TODO
            resolve();
        });
    }

    loadSavedValue() {
            // TODO
        return undefined;
    }

    clearSavedValue() {
        return new Promise<void>((resolve) => {
            localStorage.removeItem(this.functionName);
            this.setState(_ => {
                return {
                    valueSet: false
                }
            }, resolve);
        });
    }

    renderValue() {
        let grayedIffUnset = this.state.valueSet ? '' : 'grayed';
        let display = `Machine(initialized: maybe)`;
        return (
            <div className={`module-value ${grayedIffUnset}`}
                 key={`${this.titleKey}-value`}>
                 { display }
            </div>
        );
    }

    private connect() {
        const machineBaudRate = 115200;
        let chosenPath = this.selectedPortPath;
        if (!chosenPath) {
            return;
        }
        let port = new verso.Port(chosenPath, machineBaudRate);
        port.connect().then((successfulConnection) => {
            if (successfulConnection) {
                this.setState((prevState) => {
                    return {
                        connected: true,
                        port: port
                    };
                });
            }
        });
    }

    private homeAxis(axis: verso.Axis) {
        let port = this.state.port;
        if (!port || !port.isOpen) {
            return;
        }
        let axisUpper = axis.toUpperCase();
        port.writeInstructions([`G28 ${axisUpper}`]).then((response) => {
            if (response) {
                // TODO: actually check response.
                let newAxesHomed = this.state.axesHomed.concat([axis]);
                let initialized = newAxesHomed.length === 4;
                this.setState((prevState: MachineInitializerState) => {
                    return {
                        axesHomed: newAxesHomed,
                        initialized: initialized
                    }
                }, () => {
                    if (initialized) {
                        RERUN();
                    }
                });
            }
        });
    }

    renderSnippet(snippetText: string) {
        let detabbedSnippet = snippetText.replaceAll('\n    ', '\n');
        return (
            <pre className="code-box"><code>
                { `function ${detabbedSnippet}` }
            </code></pre>
        );
    }

    grayIffUnconnected() {
        return this.state.connected ? '' : 'grayed';
    }

    grayIffUAxisNotHomed() {
        return this.state.axesHomed.includes('u') ? '' : 'grayed';
    }

    grayIffYAxisNotHomed() {
        return this.state.axesHomed.includes('y') ? '' : 'grayed';
    }

    grayIffZAxisNotHomed() {
        return this.state.axesHomed.includes('z') ? '' : 'grayed';
    }

    setSelectedPortPathIndex(index: number) {
        this.setState((prevState) => ({ selectedPortPathIndex: index }));
    };

    renderPortPaths() {
        let portPathDoms = this.state.portPaths.map((path, idx) => {
            let maybeHighlight = idx === this.state.selectedPortPathIndex
                                    ? 'highlight' : '';
            return (
                <div className={`viz-interpreter-item ${maybeHighlight}`}
                     key={idx}
                     data-toolpath-index={idx}
                     onClick={this.setSelectedPortPathIndex.bind(this, idx)}>
                    <span className="interpreter-name param-key"
                          data-interpreter-id={idx}>
                         { path }
                    </span>
                </div>
            );
        });
        return (
            <div className="boxed-list">
                { portPathDoms }
            </div>
        );
    }

    renderContent() {
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        return <div className={`tabletop-calibrator content ${maybeHidden}`}
                    key={this.contentKey.toString()}>
                   <div className="subtitle">
                       Machine Initialized? {
                           this.state.initialized ? 'Yes' : 'No'
                       }
                   </div>
                   <div className="help-text">
                       1. Connect to the machine.
                   </div>
                   <br/>
                   { this.renderPortPaths() }
                   { this.renderSnippet(this.connect.toString()) }
                   <div onClick={this.connect.bind(this)}
                        className="button" id="mi-connect">
                       Send Code
                   </div>
                   <div className="help-text">
                       2. Home the U, Y, Z, then X axes.
                   </div>
                   { this.renderSnippet(this.homeAxis.toString()) }
                   <div onClick={this.homeAxis.bind(this, 'u')}
                        className={`button ${this.grayIffUnconnected()}`} id="mi-home-u">
                       Home U
                   </div>
                   <div onClick={this.homeAxis.bind(this, 'y')}
                        className={`button ${this.grayIffUAxisNotHomed()}`} id="mi-home-y">
                       Home Y
                   </div>
                   <div onClick={this.homeAxis.bind(this, 'z')}
                        className={`button ${this.grayIffYAxisNotHomed()}`} id="mi-home-z">
                       Home Z
                   </div>
                   <div onClick={this.homeAxis.bind(this, 'x')}
                        className={`button ${this.grayIffZAxisNotHomed()}`} id="mi-home-x">
                       Home X
                   </div>
               </div>;
    }
}

type MachineState = 'disconnected' | 'free' | 'busy'

interface DispatcherProps extends ModuleProps {
    ref: React.RefObject<Dispatcher>;
};

interface DispatcherState extends ModuleState {
    machine?: verso.Machine;
    toolpaths?: verso.Toolpath[];
    currentToolpathIndex: number;
    machineState: MachineState;
};

class Dispatcher extends VersoModule {
    props: DispatcherProps;
    state: DispatcherState;

    constructor(props: DispatcherProps) {
        super(props);
        this.titleText = 'Dispatcher';
        this.functionName = '$dispatcher';
        this.props = props;
        this.state = {
            windowOpen: props.windowOpen,
            valueSet: false,
            machine: undefined,
            toolpaths: undefined,
            currentToolpathIndex: 0,
            machineState: 'disconnected'
        };
    }

    get currentToolpath() {
        if (!this.state.toolpaths || this.state.toolpaths.length === 0) {
            return null;
        }
        return this.state.toolpaths[this.state.currentToolpathIndex];
    }

    get isFree() {
        return this.state.machineState === 'free';
    }

    private __expandHelper(machine: verso.Machine, toolpaths: verso.Toolpath[]) {
        if (!toolpaths.length) {
            console.error('Dispatcher needs an array of toolpaths.');
            return;
        }
        // @ts-ignore
        let mc: typeof this = PROGRAM_PANE.getModuleWithName(FUNCTION_NAME_PLACEHOLDER);
        mc.setState(_ => {
            let machineState = machine.initialized && machine.port
                                && machine.port.isOpen
                                ? 'free' : 'disconnected';
            return {
                machine: machine,
                toolpaths: toolpaths,
                machineState: machineState
            }
        });
        return undefined;
    }

    expand() : string {
        let fnString = this.__expandHelper.toString();
        fnString = fnString.replace('__expandHelper', this.functionName);
        fnString = fnString.replace('FUNCTION_NAME_PLACEHOLDER', `\'${this.functionName}\'`);
        fnString = 'async function ' + fnString;
        return fnString;
    }

    saveValue() {
        return new Promise<void>((resolve) => {
            // TODO
            resolve();
        });
    }

    loadSavedValue() {
            // TODO
        return undefined;
    }

    clearSavedValue() {
        return new Promise<void>((resolve) => {
            localStorage.removeItem(this.functionName);
            this.setState(_ => {
                return {
                    valueSet: false
                }
            }, resolve);
        });
    }

    renderValue() {
        let grayedIffUnset = this.state.valueSet ? '' : 'grayed';
        let display = `Machine(initialized: maybe)`;
        return (
            <div className={`module-value ${grayedIffUnset}`}
                 key={`${this.titleKey}-value`}>
                 { display }
            </div>
        );
    }

    renderMachineState() {
        return (
            <div className="subtitle">
                Machine status: {this.state.machineState}
            </div>
        );
    }

    renderTerminal() {
        return (
            <input type="text" id="dispatch-terminal"
                 placeholder="; Enter G-code to adjust the tool prior to dispatch."></input>
        );
    }

    sendSnippet() {
       let snippetDom = document.getElementById('dispatch-send-snippet');
       if (!snippetDom || !this.state.machine ||
           !this.state.machine.port || !this.isFree) { return; }
       let snippet = snippetDom.innerText;
       // TODO: validation
       this.state.machine.port.writeInstructions([snippet])
           .then((response) => {
               // TODO: set busy/free again, make a mini console
               console.log(response);
           });
    }

    dispatchSelectedToolpath() {
        if (this.currentToolpath && this.state.machine
            && this.state.machine.port && this.isFree) {
            this.state.machine.port
                .writeInstructions(this.currentToolpath.instructions)
                .then((response) => {
                    // TODO: set busy/free again, make a mini console
                    console.log(response);
                });
        }
    }

    setCurrentToolpathIndex(index: number) {
        this.setState((prevState) => ({ currentToolpathIndex: index }));
    }

    renderToolpathChoices() {
        if (!this.state.toolpaths) {
            return;
        }
        let interpreterDoms = this.state.toolpaths
                                  .map((tp: verso.Toolpath,
                                        idx: number) => {
            let maybeHighlight = idx === this.state.currentToolpathIndex
                                ? 'highlight' : '';
            return (
                <div className={`viz-interpreter-item ${maybeHighlight}`}
                     key={idx}
                     data-toolpath-index={idx}
                     onClick={this.setCurrentToolpathIndex.bind(this, idx)}>
                    <span className="interpreter-name param-key"
                          data-interpreter-id={idx}>
                         { `Toolpath ${idx}` }
                    </span>
                </div>
            );
        });
        return (
            <div id="cam-compiler-list" className="boxed-list">
                { interpreterDoms }
            </div>
        );
    }

    renderContent() {
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        let grayIffNotFree = this.isFree ? '' : 'grayed';
        return (
            <div className={`dispatcher content ${maybeHidden}`}>
                { this.renderMachineState() }
                { this.renderTerminal() }
               <div onClick={this.sendSnippet.bind(this)}
                    className={`button ${grayIffNotFree}`}
                    id="dispatch-send-snippet">
                   Send Snippet
               </div>
                { this.renderToolpathChoices() }
               <div onClick={this.dispatchSelectedToolpath.bind(this)}
                    className={`button ${grayIffNotFree}`}
                    id="dispatch-send-toolpath">
                   Dispatch
               </div>
            </div>
        );
    }
}

interface DisplayProps extends ModuleProps {
    ref: React.RefObject<Display>;
};

interface DisplayState extends ModuleState {
    displayValue: string;
};

class Display extends VersoModule {
    props: DisplayProps;
    state: DisplayState;

    constructor(props: DisplayProps) {
        super(props);
        this.titleText = 'Display';
        this.functionName = '$display';
        this.props = props;
        this.state = {
            windowOpen: props.windowOpen,
            valueSet: false,
            displayValue: 'nothing'
        };
    }

    private __expandHelper(value: any) {
        // @ts-ignore
        let d: typeof this = PROGRAM_PANE.getModuleWithName(FUNCTION_NAME_PLACEHOLDER);
        let stringifiedValue: string;
        try {
            stringifiedValue = JSON.stringify(value)
        }
        catch (TypeError) {
            stringifiedValue = '<cyclic object>';
        }
        d.setState(_ => ({ displayValue: stringifiedValue }));
        return value;
    }

    expand() : string {
        let fnString = this.__expandHelper.toString();
        fnString = fnString.replace('__expandHelper', this.functionName);
        fnString = fnString.replace('FUNCTION_NAME_PLACEHOLDER', `\'${this.functionName}\'`);
        fnString = 'async ' + fnString;
        return fnString;
    }

    saveValue() {
        return new Promise<void>((resolve) => {
            // TODO
            resolve();
        });
    }

    loadSavedValue() {
            // TODO
        return undefined;
    }

    clearSavedValue() {
        return new Promise<void>((resolve) => {
            localStorage.removeItem(this.functionName);
            this.setState(_ => {
                return {
                    valueSet: false
                }
            }, resolve);
        });
    }

    renderValue() {
        let grayedIffUnset = this.state.valueSet ? '' : 'grayed';
        let display = `Machine(initialized: maybe)`;
        return (
            <div className={`module-value ${grayedIffUnset}`}
                 key={`${this.titleKey}-value`}>
            </div>
        );
    }

    renderContent() {
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        return (
            <div className={`machine-initializer content ${maybeHidden}`}>
                <div id="display-box">
                    { this.state.displayValue || 'nothing' }
                </div>
            </div>
        );
    }
}

interface MiniCamProps extends ModuleProps {
    ref: React.RefObject<MiniCam>;
};

interface MiniCamState extends ModuleState {
    geometries: verso.Geometry[];
    // Each geometry has an associated operation
    operations: verso.CamOperation[];
    toolpaths: verso.Toolpath[];
    selectedGeometryIndex: number;
};

class MiniCam extends VersoModule {
    props: MiniCamProps;
    state: MiniCamState;

    constructor(props: MiniCamProps) {
        super(props);
        this.titleText = 'MiniCam';
        this.functionName = '$miniCam';
        this.props = props;
        this.state = {
            windowOpen: props.windowOpen,
            valueSet: false,
            selectedGeometryIndex: 0,
            geometries: [],
            operations: [],
            toolpaths: []
        };
    }

    get selectedGeometry() {
        let index = this.state.selectedGeometryIndex;
        if (index >= this.state.geometries.length) {
            return undefined;
        }
        return this.state.geometries[index];
    }

    get selectedOperation() {
        let index = this.state.selectedGeometryIndex;
        if (index >= this.state.operations.length) {
            return verso.CamOperation.defaultOperation;
        }
        return this.state.operations[index];
    }

    get selectedToolpath() {
        let index = this.state.selectedGeometryIndex;
        if (index >= this.state.toolpaths.length) {
            return undefined;
        }
        return this.state.toolpaths[index];
    }

    private __expandHelper(geometries: verso.Geometry[],
                           operations: verso.CamOperation[]) {
        if (geometries.length !== operations.length) {
            console.error('The length of geometries and operations must match.');
            return [];
        }
        // @ts-ignore
        let mc: typeof this = PROGRAM_PANE.getModuleWithName(FUNCTION_NAME_PLACEHOLDER);
        let selectedGeom = mc.selectedGeometry;
        let tps = geometries.map((currentGeom, geomIndex) => {
            let operation = operations[geomIndex];
            let cam = new verso.Cam(currentGeom, operation);
            let gCode = cam.getGcode();
            let tp = new verso.Toolpath(currentGeom.filepath || '', gCode);
            return tp;
        });
        mc.setState(_ => {
            return {
                geometries: geometries,
                operations: operations,
                toolpaths: tps
            };
        });
        return tps;
    }

    expand() : string {
        let fnString = this.__expandHelper.toString();
        fnString = fnString.replace('__expandHelper', this.functionName);
        fnString = fnString.replace('FUNCTION_NAME_PLACEHOLDER', `\'${this.functionName}\'`);
        fnString = 'async function ' + fnString;
        return fnString;
    }

    saveValue() {
        return new Promise<void>((resolve) => {
            // TODO
            resolve();
        });
    }

    loadSavedValue() {
            // TODO
        return undefined;
    }

    clearSavedValue() {
        return new Promise<void>((resolve) => {
            localStorage.removeItem(this.functionName);
            this.setState(_ => {
                return {
                    valueSet: false
                }
            }, resolve);
        });
    }

    renderValue() {
        let grayedIffUnset = this.state.valueSet ? '' : 'grayed';
        let display = `Machine(initialized: maybe)`;
        return (
            <div className={`module-value ${grayedIffUnset}`}
                 key={`${this.titleKey}-value`}>
                 { display }
            </div>
        );
    }

    renderInstructions() {
        let selectedToolpath = this.selectedToolpath;
        let instElements : JSX.Element[] = [];
        if (selectedToolpath) {
            instElements = selectedToolpath.instructions
                .map((inst, idx) => {
                return (
                    <div className={`inst-list-item`}
                         key={idx}>{inst}</div>
                );
            });
        }
        return (
            <div id="inst-list" className="boxed-list">{ instElements }</div>
        );
    }

    handleParamChange() {
    }

    setSelectedGeometry(geomIdx: number) {
        this.setState(_ => ({ selectedGeometryIndex: geomIdx }));
    }

    renderGalleryItem(geometry: verso.Geometry, geomIdx: number) {
        const maybeHighlight = geomIdx === this.state.selectedGeometryIndex
                               ? 'gallery-highlight' : '';
        return <div className={`gallery-item ${maybeHighlight}`}
                    data-geometry-name={name}
                    onClick={this.setSelectedGeometry.bind(this, geomIdx)}
                    key={geomIdx}>
                    <img src={geometry.filepath}
                         className="gallery-image"/>
               </div>;
    }

    renderGeometries() {
        let galleryItems = this.state.geometries.map((geometry, idx) => {
            return this.renderGalleryItem(geometry, idx);
        });
        return (
            <div className="gallery">
                { galleryItems }
            </div>
        );
    }

    renderOperationPreview() {
        let opValues = Object.keys(this.selectedOperation).map((opKey, idx) => {
            return (
                <div className="param-item"
                     key={idx}>
                    <span className="param-key">
                         { opKey }
                    </span>
                    <span className="param-value">
                         { this.selectedOperation[opKey] }
                    </span>
                </div>
            );
        });
        return (
            <div className="boxed-list">
                { opValues }
            </div>
        );
    }

    renderContent() {
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        return (
            <div className={`mini-cam content ${maybeHidden}`}>
                { this.renderGeometries() }
                <div className="subtitle">Parameters for:
                    {this.selectedGeometry && this.selectedGeometry.filename}
                </div>
                { this.renderOperationPreview() }
                { this.renderInstructions() }
            </div>
        );
    }
}

interface ProjectorProps extends ModuleProps {
    ref: React.RefObject<Projector>;
};

interface ProjectorState extends ModuleState {
    bitmapDataUrl: string;
}
;
class Projector extends VersoModule {
    props: ProjectorProps;
    state: ProjectorState;

    constructor(props: ProjectorProps) {
        super(props);
        this.titleText = 'Projector';
        this.functionName = '$projector';
        this.props = props;
        this.state = {
            windowOpen: props.windowOpen,
            valueSet: false,
            bitmapDataUrl: ''
        };
    }

    private __expandHelper(tabletop: verso.Tabletop, vizSpace: verso.VisualizationSpace) {
        // @ts-ignore
        let pr: typeof this = PROGRAM_PANE.getModuleWithName(FUNCTION_NAME_PLACEHOLDER);
        return new Promise<void>((resolve, reject) => {
            pr.generateBitmapFromVizSpace(vizSpace).then(_ => {
                resolve();
            });
        });
    }

    expand() : string {
        let fnString = this.__expandHelper.toString();
        fnString = fnString.replace('__expandHelper', this.functionName);
        fnString = fnString.replace('FUNCTION_NAME_PLACEHOLDER', `\'${this.functionName}\'`);
        fnString = 'async ' + fnString;
        return fnString;
    }

    generateBitmapFromVizSpace(vizSpace: verso.VisualizationSpace) {
        return new Promise<void>((resolve, reject) => {
            let canvasDom = vizSpace.domElement;
            if (!canvasDom) {
                console.log('Cannot find a canvas DOM.');
                reject();
                return;
            }
            let dataUrl = canvasDom.toDataURL('image/png');
            this.setState(_ => ({ bitmapDataUrl: dataUrl }), resolve);
        });
    }

    saveValue() {
        return new Promise<void>((resolve) => {
            // TODO
            resolve();
        });
    }

    loadSavedValue() {
            // TODO
        return undefined;
    }

    clearSavedValue() {
        return new Promise<void>((resolve) => {
            localStorage.removeItem(this.functionName);
            this.setState(_ => {
                return {
                    valueSet: false
                }
            }, resolve);
        });
    }

    renderValue() {
        let grayedIffUnset = this.state.valueSet ? '' : 'grayed';
        let projector = `Machine(initialized: maybe)`;
        return (
            <div className={`module-value ${grayedIffUnset}`}
                 key={`${this.titleKey}-value`}>
            </div>
        );
    }

    renderContent() {
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        return (
            <div className={`machine-initializer content ${maybeHidden}`}>
                <div id="projector-box">
                   <div className="image-thumbnail">
                       <img src={this.state.bitmapDataUrl}
                            id="projector-bitmap"
                            alt="projection bitmap"/>
                   </div>
                </div>
            </div>
        );
    }
}

interface InstructionBuilderProps extends ModuleProps {
    ref: React.RefObject<InstructionBuilder>;
};

interface InstructionBuilderState extends ModuleState {
    paramSet: InstructionParamsG0;
    paramBounds: InstructionParamsG0;
};

interface InstructionParamsG0 {
    x: number;
    y: number;
    z: number;
    e: number;
    f: number;
    [index: string]: number;
};

class InstructionBuilder extends VersoModule {
    props: InstructionBuilderProps;
    state: InstructionBuilderState;

    static params_G0: InstructionParamsG0 = {
        x: 0, y: 0, z: 0, e: 0, f: 0
    };

    constructor(props: InstructionBuilderProps) {
        super(props);
        this.titleText = 'Instruction Builder';
        this.functionName = '$instructionBuilder';
        this.props = props;
        this.state = {
            windowOpen: props.windowOpen,
            valueSet: false,
            paramSet: {
                x: 0, y: 0, z: 0, e: 0, f: 0
            },
            paramBounds: {
                x: 300, y: 300, z: 300, e: 1000, f: 1000
            }
        };
    }

    private __expandHelper(paramBounds: InstructionParamsG0) {
        // @ts-ignore
        let ib: typeof this = PROGRAM_PANE.getModuleWithName(FUNCTION_NAME_PLACEHOLDER);
        return new Promise<verso.Instruction>((resolve, reject) => {
            if (paramBounds) {
                ib.setArguments(paramBounds).then(_ => {
                    resolve(ib.generateInstructionFromStoredParams());
                });
            }
            else {
                resolve(ib.generateInstructionFromStoredParams());
            }
        });
    }

    expand() : string {
        let fnString = this.__expandHelper.toString();
        fnString = fnString.replace('__expandHelper', this.functionName);
        fnString = fnString.replace('FUNCTION_NAME_PLACEHOLDER', `\'${this.functionName}\'`);
        fnString = fnString.replace('async', 'async function');
        fnString = 'async ' + fnString;
        return fnString;
    }

    setArguments(paramBounds: InstructionParamsG0) {
        return new Promise<void>((resolve, reject) => {
            this.setState(_ => ({ paramBounds }), resolve);
        });
    }

    generateInstructionFromStoredParams() {
        let paramSet = this.state.paramSet;
        let op = 'G0 ';
        let xArg = paramSet.x !== undefined ? `X${paramSet.x} ` : '';
        let yArg = paramSet.y !== undefined ? `Y${paramSet.y} ` : '';
        let zArg = paramSet.z !== undefined ? `Z${paramSet.z} ` : '';
        let eArg = paramSet.e !== undefined ? `E${paramSet.e} ` : '';
        let fArg = paramSet.f !== undefined ? `F${paramSet.f} ` : '';
        let inst = [op, xArg, yArg, zArg, eArg, fArg].join('').trim();
        return inst;
    };

    saveValue() {
        return new Promise<void>((resolve) => {
            let stringifiedParams = JSON.stringify(this.state.paramSet);
            localStorage.setItem(this.functionName, stringifiedParams);
            resolve();
        });
    }

    loadSavedValue() {
        let stringifiedParams = localStorage.getItem(this.functionName);
        if (!stringifiedParams) {
            return undefined;
        }
        try {
            return JSON.parse(stringifiedParams);
        }
        catch (Error) {
            return undefined;
        }
    }

    clearSavedValue() {
        return new Promise<void>((resolve) => {
            localStorage.removeItem(this.functionName);
            this.setState(_ => {
                return {
                    valueSet: false
                }
            }, resolve);
        });
    }

    renderValue() {
        let grayedIffUnset = this.state.valueSet ? '' : 'grayed';
        let instructionBuilder = `Machine(initialized: maybe)`;
        return (
            <div className={`module-value ${grayedIffUnset}`}
                 key={`${this.titleKey}-value`}>
            </div>
        );
    }

    updateParams(event: React.ChangeEvent<HTMLInputElement>) {
        let input = event.target;
        let valueNum = isNaN(parseInt(input.value))
            ? 0 : parseInt(input.value);
        let paramName = input.dataset.paramName as string;
        if (!paramName) { return; }
        let paramSetCopy = Object.assign({}, this.state.paramSet);
        paramSetCopy[paramName] = valueNum;
        this.setState(_ => {
            return {
                paramSet: paramSetCopy
            };
        });
    }

    renderInputForParamName(paramName: string) {
        let value = this.state.paramSet[paramName];
        if (paramName === 'e' || paramName === 'f') {
            const defaultBound = 100;
            let maybeBound = this.state.paramBounds[paramName];
            let bound: number;
            if (maybeBound === undefined) {
                bound = defaultBound;
            }
            else {
                bound = maybeBound;
            }
            let currentValue = this.state.paramSet[paramName] !== undefined
                                ? this.state.paramSet[paramName] : 0;
            return (
                <input type="range" min="0" max={bound}
                       className="slider"
                       placeholder={value.toString()}
                       data-param-name={paramName}
                       onChange={this.updateParams.bind(this)}
                       id={`instruction-builder-slider-${paramName}`}>
                </input>
            );
        }
        else {
            return (
                <input type="text"
                       placeholder={value.toString()}
                       data-param-name={paramName}
                       onChange={this.updateParams.bind(this)}>
                </input>
            );
        }
    }

    renderInstructionParams() {
        return Object.keys(InstructionBuilder.params_G0)
            .map((paramName, paramIdx) => {
            let value = this.state.paramSet[paramName];
            return (
                <div className="param-item"
                     key={paramIdx}>
                    <span className="param-key">
                         { paramName }
                    </span>
                    <span className="param-value">
                        { this.renderInputForParamName(paramName) }
                    </span>
                </div>
            );
        });
    }

    renderInstruction() {
        let instruction = this.generateInstructionFromStoredParams();
        return (
            <div className="display-box">
                <div className="title">
                    { instruction }
                </div>
            </div>
        );
    }

    renderContent() {
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        return (
            <div className={`instruction-builder content ${maybeHidden}`}>
                <div id="instruction-builder-box">
                    { this.renderInstruction() }
                    { this.renderInstructionParams() }
                </div>
            </div>
        );
    }
}

interface ArraySlicerProps extends ModuleProps {
    ref: React.RefObject<ArraySlicer>;
};

interface ArraySlicerState extends ModuleState {
    arraySlicerValue: string;
};

class ArraySlicer extends VersoModule {
    props: ArraySlicerProps;
    state: ArraySlicerState;

    constructor(props: ArraySlicerProps) {
        super(props);
        this.titleText = 'ArraySlicer';
        this.functionName = '$arraySlicer';
        this.props = props;
        this.state = {
            windowOpen: props.windowOpen,
            valueSet: false,
            arraySlicerValue: 'nothing'
        };
    }

    private __expandHelper(value: any) {
        // @ts-ignore
        let d: typeof this = PROGRAM_PANE.getModuleWithName(FUNCTION_NAME_PLACEHOLDER);
        let stringifiedValue: string;
        try {
            stringifiedValue = JSON.stringify(value)
        }
        catch (TypeError) {
            stringifiedValue = '<cyclic object>';
        }
        d.setState(_ => ({ arraySlicerValue: stringifiedValue }));
        return value;
    }

    expand() : string {
        let fnString = this.__expandHelper.toString();
        fnString = fnString.replace('__expandHelper', this.functionName);
        fnString = fnString.replace('FUNCTION_NAME_PLACEHOLDER', `\'${this.functionName}\'`);
        fnString = 'async function ' + fnString;
        return fnString;
    }

    saveValue() {
        return new Promise<void>((resolve) => {
            // TODO
            resolve();
        });
    }

    loadSavedValue() {
            // TODO
        return undefined;
    }

    clearSavedValue() {
        return new Promise<void>((resolve) => {
            localStorage.removeItem(this.functionName);
            this.setState(_ => {
                return {
                    valueSet: false
                }
            }, resolve);
        });
    }

    renderValue() {
        let grayedIffUnset = this.state.valueSet ? '' : 'grayed';
        let arraySlicer = `Machine(initialized: maybe)`;
        return (
            <div className={`module-value ${grayedIffUnset}`}
                 key={`${this.titleKey}-value`}>
            </div>
        );
    }

    renderContent() {
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        return (
            <div className={`machine-initializer content ${maybeHidden}`}>
                <div id="arraySlicer-box">
                    { this.state.arraySlicerValue || 'nothing' }
                </div>
            </div>
        );
    }
}

export { ProgramPane };
