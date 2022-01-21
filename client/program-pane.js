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
import * as verso from './verso.js';
import { mm, px } from './verso.js';
window.mm = mm;
window.px = px;
;
;
;
;
;
class ResetExecution extends Error {
    constructor() {
        let message = 'Resetting execution.';
        super(message);
    }
}
class ProgramUtil {
    static parseTextForLivelit(text, plRef, livelitRef) {
        const re = /\$\w+/;
        const maybeMatch = text.match(re);
        const defaultEl = React.createElement("div", null);
        if (!maybeMatch) {
            return null;
        }
        const livelitName = maybeMatch[0].slice(1);
        switch (livelitName) {
            case 'geometryGallery':
                const ggProps = {
                    ref: livelitRef,
                    plRef: plRef,
                    valueSet: false,
                    windowOpen: false
                };
                return React.createElement(GeometryGallery, { ...ggProps });
            case 'pointPicker':
                const ppProps = {
                    ref: livelitRef,
                    plRef: plRef,
                    valueSet: false,
                    windowOpen: false
                };
                return React.createElement(PointPicker, { ...ppProps });
            case 'tabletopCalibrator':
                const tcProps = {
                    machine: undefined,
                    tabletop: undefined,
                    ref: livelitRef,
                    plRef: plRef,
                    valueSet: false,
                    windowOpen: false
                };
                return React.createElement(TabletopCalibrator, { ...tcProps });
            case 'cameraCalibrator':
                const ccProps = {
                    ref: livelitRef,
                    plRef: plRef,
                    valueSet: false,
                    windowOpen: false
                };
                return React.createElement(CameraCalibrator, { ...ccProps });
            case 'faceFinder':
                const ffProps = {
                    camera: undefined,
                    ref: livelitRef,
                    plRef: plRef,
                    valueSet: false,
                    windowOpen: false
                };
                return React.createElement(FaceFinder, { ...ffProps });
            case 'camCompiler':
                const camProps = {
                    ref: livelitRef,
                    plRef: plRef,
                    valueSet: false,
                    windowOpen: false
                };
                return React.createElement(CamCompiler, { ...camProps });
            case 'toolpathVisualizer':
                const tdProps = {
                    ref: livelitRef,
                    plRef: plRef,
                    valueSet: false,
                    windowOpen: false
                };
                return React.createElement(ToolpathVisualizer, { ...tdProps });
            default:
                return null;
        }
    }
}
class ProgramPane extends React.Component {
    constructor(props) {
        super(props);
        this.defaultLinesSignature = [
            'let signature = $geometryGallery;',
            'let point = $pointPicker;',
            'let toolpath = signature.placeAt(point);',
            '// $toolpathTransformer signature',
            '// $machineSynthesizer gigapan coinGeometry',
            'machine.plot(toolpath);'
        ];
        this.defaultLinesMustacheExpanded = [
            'let machine = new verso.Machine(\'axidraw\');',
            'let tabletop = new verso.Tabletop();',
            'tabletop = tabletop',
            'let camera = new verso.Camera(tabletop);',
            'let mustache = new verso.Geometry(\'./toolpaths/mustache.svg\')',
            'let faceRegions = await camera.findFaceRegions();',
            'let faceCentroids = faceRegions.map(r => r.centroid);',
            'let toolpaths = faceCentroids.map(c => mustache.placeAt(c, tabletop));',
            'toolpaths.forEach(toolpath => machine.plot(toolpath));'
        ];
        this.defaultLinesMustacheLiveLits = [
            'let machine = new verso.Machine(\'axidraw\');',
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
        this.defaultToolpathPreviewing = [
            'let machine = new verso.Machine(\'axidraw\');',
            '// TODO: pen up calibrator with preview',
            'let tabletop = await $tabletopCalibrator(machine);',
            'let camera = await $cameraCalibrator(tabletop);',
            'let point = new verso.Point(mm(75), mm(25));',
            'let mustache = await $geometryGallery(machine, tabletop);',
            '// TODO: use either camera or toolpath direct manipulator',
            'let placedMustache = mustache.placeAt(point, tabletop);',
            'let toolpath = await $camCompiler(machine, placedMustache);',
            'let visualizer = await $toolpathVisualizer(machine, toolpath, tabletop);'
        ];
        this.state = {
            currentWorkflow: this.defaultToolpathPreviewing,
            running: false
        };
        this.livelitRefs = [];
        this.plRefs = [];
        this.modulePaneRef = React.createRef();
    }
    componentDidMount() {
        document.querySelectorAll('pre code').forEach((el) => {
            hljs.highlightElement(el);
        });
    }
    renderTextLines(textLines) {
        this.livelitRefs = [];
        this.plRefs = [];
        const lines = textLines.map((line, index) => {
            const lineNumber = index + 1;
            const livelitRef = React.createRef();
            const plRef = React.createRef();
            this.plRefs.push(plRef);
            this.livelitRefs.push(livelitRef);
            return React.createElement(ProgramLine, { lineNumber: lineNumber, key: index, refForLivelit: livelitRef, ref: plRef, lineText: line });
        }).flat();
        if (this.modulePaneRef.current) {
            this.modulePaneRef.current.updateProgramLineRefs(this.plRefs);
        }
        return lines;
    }
    __getModules() {
        let modules = [];
        if (this.modulePaneRef.current) {
            let maybeNullMods = this.modulePaneRef.current.getModules();
            let nonNullMods = maybeNullMods.filter((mod) => {
                return mod !== null;
            });
            return nonNullMods;
        }
        else {
            return [];
        }
    }
    getLivelitWithName(functionName) {
        let modules = this.__getModules();
        let moduleWindow = modules.find((mod) => {
            return mod.functionName === functionName;
        });
        return moduleWindow ? moduleWindow : {};
    }
    gatherLivelitsAsFunctionDeclarations() {
        ;
        let mods = this.__getModules();
        let expandedFunctionStrings = [];
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
            return programLines.map(el => el.innerText).join('\n');
        };
        const PROGRAM_PANE = this;
        this.setRunning(true, () => {
            let innerProgText = extractProgramText();
            let livelitFunctionDeclarations = this.gatherLivelitsAsFunctionDeclarations();
            let progText = `${livelitFunctionDeclarations}`;
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
    setRunning(running, callback) {
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
                        .querySelector(':not(.hidden) > .apply-btn');
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
            this.modulePaneRef.current.setState((prevState) => {
                return { lines: this.state.currentWorkflow };
            });
        }
    }
    typeCheck() {
        console.log('Looks good to me @_@');
    }
    render() {
        let maybeGrayed = this.state.running ? 'grayed' : '';
        let hiddenIffNotRunning = this.state.running ? '' : 'hidden';
        return (React.createElement("div", { id: "program-pane" },
            React.createElement("div", { id: "program-lines-and-controls" },
                React.createElement("div", { id: "program-lines" }, this.renderTextLines(this.state.currentWorkflow)),
                React.createElement("div", { id: "program-controls" },
                    React.createElement("div", { className: `pc-btn pc-compile ${maybeGrayed}`, onClick: this.compile.bind(this) }, "Generate"),
                    React.createElement("div", { className: `pc-btn pc-run ${maybeGrayed}`, onClick: this.runAllLines.bind(this) }, "Run"),
                    React.createElement("div", { className: `pc-btn pc-reset ${hiddenIffNotRunning}`, onClick: this.resetExecution.bind(this) }, "Reset"))),
            React.createElement(ModulePane, { plRefs: this.plRefs, ref: this.modulePaneRef })));
    }
}
class ModulePane extends React.Component {
    constructor(props) {
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
    mapLinesToLivelits() {
        let livelits = this.state.lines.map((lineText, lineIndex) => {
            let plRef = this.plRefs[lineIndex];
            let moduleRef = React.createRef();
            this.moduleRefs.push(moduleRef);
            return ProgramUtil.parseTextForLivelit(lineText, plRef, moduleRef);
        });
        let nonNullLiveLits = livelits.filter((ll) => {
            return ll !== null;
        });
        return nonNullLiveLits;
    }
    updateProgramLineRefs(plRefs) {
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
        return (React.createElement("div", { id: "module-pane", key: "module-pane" }, this.mapLinesToLivelits()));
    }
}
class ProgramLine extends React.Component {
    constructor(props) {
        super(props);
        this.colorSetLivelit = 0x888888;
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
            let newState = {
                lineText: prevState.lineText,
                expandedLineText: prevState.lineText,
                highlight: prevState.highlight
            };
            return newState;
        });
    }
    render() {
        const highlightClass = this.state.highlight ? 'pl-highlight' : '';
        const lineNumber = this.props.lineNumber || 0;
        return React.createElement("div", { className: `program-line ${highlightClass}`, id: `line-${lineNumber - 1}`, onClick: this.toggleLivelitWindow.bind(this) },
            React.createElement("pre", { className: "program-line-text language-typescript" },
                React.createElement("code", null, this.state.lineText)));
    }
}
class LivelitWindow extends React.Component {
    constructor(props) {
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
        };
    }
    expand() {
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
        await this.setState((prev) => {
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
    async _setWindowOpenState(open) {
        return new Promise((resolve) => {
            this.setState((prev) => {
                return { windowOpen: open };
            }, resolve);
        });
    }
    ;
    handleAbortExecution() {
        throw new ResetExecution();
    }
    saveValue() {
        return undefined;
    }
    clearSavedValue() {
        return new Promise((resolve) => {
            resolve();
        });
    }
    renderTitle() {
        return React.createElement("div", { className: "title", key: this.titleKey.toString() }, this.titleText);
    }
    renderValue() {
        let maybeGrayed = this.state.valueSet ? '' : 'grayed';
        return (React.createElement("div", { className: `module-value ${maybeGrayed}`, key: `${this.titleKey}-value` }, "I am the value."));
    }
    renderContent() {
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        return React.createElement("div", { className: `content ${maybeHidden}`, key: this.contentKey.toString() });
    }
    renderClearButton() {
        let hiddenIffUnset = this.state.valueSet ? '' : 'hidden';
        return (React.createElement("div", { className: `clear-btn ${hiddenIffUnset}`, onClick: this.clearSavedValue.bind(this), key: `${this.titleKey}-clear-value` }, "Clear"));
    }
    render() {
        return React.createElement("div", { className: this.livelitClassName, key: this.livelitClassName }, [this.renderTitle(),
            this.renderValue(),
            this.renderClearButton(),
            this.renderContent()]);
    }
}
;
;
;
class GeometryGallery extends LivelitWindow {
    constructor(props) {
        super(props);
        this.titleText = 'Geometry Gallery';
        this.functionName = '$geometryGallery';
        this.applyButton = React.createElement("div", { className: "button apply-btn", id: "choose-geometry" }, "Choose");
        this.state = {
            selectedUrl: '',
            imageNameUrlPairs: [],
            windowOpen: props.windowOpen,
            abortOnResumingExecution: false,
            valueSet: props.valueSet
        };
        this.fetchGeometryNames()
            .then((imageNameUrlPairs) => {
            let maybeSavedName = this.loadSavedValue();
            let selectedUrl = '';
            let valueSet = false;
            if (maybeSavedName) {
                selectedUrl = this.getUrlForGeometryName(maybeSavedName, imageNameUrlPairs);
                valueSet = true;
            }
            this.setState(_ => ({ selectedUrl, imageNameUrlPairs, valueSet }));
        });
    }
    expand() {
        let s = `async function ${this.functionName}(machine, tabletop) {`;
        // TODO: filter geometries by machine
        s += `let gg = PROGRAM_PANE.getLivelitWithName(\'${this.functionName}\');`;
        s += `let geomUrl;`;
        s += `if (!gg.state.valueSet) {`;
        s += `await gg.openWindow();`;
        s += `geomUrl = await gg.waitForGeometryChosen();`;
        s += `await gg.saveValue();`;
        s += `await gg.closeWindow();`;
        s += `}`;
        s += `else {`;
        s += `geomUrl = gg.state.selectedUrl;`;
        s += `}`;
        s += `let geom = new verso.Geometry(tabletop);`;
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
        return new Promise((resolve) => {
            if (this.state.selectedUrl) {
                let geomName = this.getGeometryNameForUrl(this.state.selectedUrl);
                localStorage.setItem(this.functionName, geomName);
                this.setState(_ => {
                    return {
                        valueSet: true
                    };
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
        return new Promise((resolve) => {
            localStorage.removeItem(this.functionName);
            this.setState(_ => {
                return {
                    selectedUrl: '',
                    valueSet: false
                };
            }, resolve);
        });
    }
    setSelectedGeometryUrl(url) {
        this.setState((state) => {
            return {
                selectedUrl: url
            };
        });
    }
    async waitForGeometryChosen() {
        return new Promise((resolve) => {
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
    renderGalleryItem(name, url, itemNumber) {
        const maybeHighlight = this.state.selectedUrl === url
            ? 'gallery-highlight' : '';
        return React.createElement("div", { className: `gallery-item ${maybeHighlight}`, "data-geometry-name": name, onClick: this.setSelectedGeometryUrl.bind(this, url), key: itemNumber.toString() },
            React.createElement("img", { src: url, className: "gallery-image" }));
    }
    getUrlForGeometryName(desiredName, versos) {
        let versoList = versos || this.state.imageNameUrlPairs;
        let versoWithName = versoList.find((verso) => {
            let geomName = verso[0];
            let geomUrl = verso[1];
            return geomName === desiredName;
        });
        let currentUrl = versoWithName ? versoWithName[1] : '';
        return currentUrl;
    }
    getGeometryNameForUrl(url, versos) {
        let versoList = versos || this.state.imageNameUrlPairs;
        let versoWithSelectedUrl = versoList.find((verso) => {
            let geomName = verso[0];
            let geomUrl = verso[1];
            return geomUrl === this.state.selectedUrl;
        });
        let geomName = versoWithSelectedUrl ? versoWithSelectedUrl[0] : '';
        return geomName;
    }
    renderValue() {
        let maybeGrayed = this.state.valueSet ? '' : 'grayed';
        let geomName = this.getGeometryNameForUrl(this.state.selectedUrl);
        return (React.createElement("div", { className: `module-value ${maybeGrayed}`, key: `${this.titleKey}-value` }, geomName));
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
        return React.createElement("div", { className: `content ${maybeHidden}`, key: this.contentKey.toString() },
            React.createElement("div", { className: "gallery" }, galleryItems),
            this.applyButton);
    }
    async fetchGeometryNames() {
        return new Promise(async (resolve) => {
            const namesUrl = '/geometries';
            let namesRes = await fetch(namesUrl);
            if (namesRes.ok) {
                let namesJson = await namesRes.json();
                let names = namesJson.names;
                let fetchImageUrl = async (name) => {
                    let imageRes = await fetch(`/geometry/${name}`);
                    if (imageRes.ok) {
                        let blob = await imageRes.blob();
                        let url = URL.createObjectURL(blob);
                        return url;
                    }
                    ;
                    return '';
                };
                let urls = await Promise.all(names.map(fetchImageUrl));
                let nameUrlPairs = names.map((name, idx) => {
                    let url = urls[idx] || '';
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
;
class PointPicker extends LivelitWindow {
    constructor(props) {
        super(props);
        this.props = props;
        this.titleText = 'Point Picker';
        this.functionName = '$pointPicker';
    }
    renderContent() {
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        return React.createElement("div", { className: `point-picker content ${maybeHidden}`, key: this.contentKey.toString() },
            React.createElement("div", { className: "table-thumbnail" },
                React.createElement("div", { className: "crosshair" })),
            React.createElement("div", { className: "point-text" }, "(154, 132)"),
            React.createElement("div", { className: "help-text" }, "Click a point in the work envelope to update this value."));
    }
}
;
;
class TabletopCalibrator extends LivelitWindow {
    constructor(props) {
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
        this.applyButton = React.createElement("div", { className: "button apply-btn", id: "apply-tabletop-homography" }, "Apply");
    }
    // FIXME: this doesn't properly apply saved homographies yet
    expand() {
        let s = `async function ${this.functionName}(machine) {`;
        s += `let tc = PROGRAM_PANE.getLivelitWithName(\'$tabletopCalibrator\');`;
        s += `tc.tabletop = new verso.Tabletop(machine);`;
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
        return new Promise((resolve) => {
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
        return new Promise((resolve) => {
            if (this.tabletop) {
                let h = this.tabletop.workEnvelope.homography;
                let hSerialized = JSON.stringify(h);
                localStorage.setItem(this.functionName, hSerialized);
                this.setState(_ => {
                    return {
                        pixelToPhysical: h,
                        valueSet: true
                    };
                }, resolve);
            }
            else {
                console.warn('TabletopCalibrator: Could not save homography.');
            }
        });
    }
    loadSavedValue() {
        let coeffsStr = localStorage.getItem(this.functionName);
        if (coeffsStr) {
            let revivedH = JSON.parse(coeffsStr);
            // Hopefully no numerical errors here.
            let h = PerspT(revivedH.srcPts, revivedH.dstPts);
            return h;
        }
        else {
            return undefined;
        }
    }
    clearSavedValue() {
        return new Promise((resolve) => {
            localStorage.removeItem(this.functionName);
            this.setState(_ => {
                return {
                    pixelToPhysical: undefined,
                    valueSet: false
                };
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
        return (React.createElement("div", { className: `module-value ${grayedIffUnset}`, key: `${this.titleKey}-value` }, display));
    }
    renderContent() {
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        return React.createElement("div", { className: `tabletop-calibrator content ${maybeHidden}`, key: this.contentKey.toString() },
            React.createElement("div", { className: "help-text" }, "1. Draw a border around the work envelope with the machine."),
            React.createElement("div", { onClick: this.drawBorder.bind(this), className: "button", id: "draw-border" }, "Draw Border"),
            React.createElement("div", { className: "help-text" }, "2. Drag the corners of the projected border to match the drawn border."),
            React.createElement("div", { onClick: this.unlockCorners.bind(this), className: "button", id: "unlock-corners" }, "Unlock Corners"),
            React.createElement("div", { className: "help-text" }, "3. Press 'Apply' when you are satisfied."),
            this.applyButton);
    }
}
;
class CameraCalibrator extends LivelitWindow {
    constructor(props) {
        super(props);
        this.props = props;
        this.camera = new verso.Camera();
        this.titleText = 'Camera Calibrator';
        this.functionName = '$cameraCalibrator';
        this.applyButtonId = 'apply-camera-homography';
        this.applyButton = React.createElement("div", { className: "button apply-btn", id: this.applyButtonId }, "Apply");
        this.photoButtonId = 'cc-take-photo';
        this.photoButton = React.createElement("div", { onClick: this.takePhoto.bind(this), className: "button", id: this.photoButtonId }, "Take Photo");
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
    setImageToTableScaling(camera) {
        let feedDom = document.getElementById('cc-unwarped-feed');
        if (feedDom && this.tabletop) {
            if (feedDom.naturalWidth === 0 || feedDom.naturalHeight === 0) {
                console.warn('Camera Calibrator: window to table scaling '
                    + 'is incorrect because there is no image yet.');
            }
            camera.imageToTabletopScale.x = this.tabletop.workEnvelope.width
                / feedDom.naturalWidth;
            camera.imageToTabletopScale.y = this.tabletop.workEnvelope.height
                / feedDom.naturalHeight;
        }
        else {
            console.warn('Camera Calibrator: could not set window to table scaling.');
        }
    }
    async acceptCameraWarp() {
        return new Promise((resolve) => {
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
        return new Promise((resolve, reject) => {
            if (this.camera.extrinsicTransform) {
                let h = this.camera.extrinsicTransform;
                let hSerialized = JSON.stringify(h);
                localStorage.setItem(this.functionName, hSerialized);
                this.setState(_ => {
                    return {
                        extrinsicTransform: h,
                        valueSet: true
                    };
                }, resolve);
            }
            else {
                console.warn('CameraCalibrator: Could not save homography.');
                resolve();
            }
        });
    }
    loadSavedValue() {
        let coeffsStr = localStorage.getItem(this.functionName);
        if (coeffsStr) {
            let revivedH = JSON.parse(coeffsStr);
            // Hopefully no numerical errors here.
            let h = PerspT(revivedH.srcPts, revivedH.dstPts);
            return h;
        }
        else {
            return undefined;
        }
    }
    clearSavedValue() {
        return new Promise((resolve) => {
            localStorage.removeItem(this.functionName);
            this.setState(_ => {
                return {
                    extrinsicTransform: undefined,
                    valueSet: false
                };
            }, resolve);
        });
    }
    expand() {
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
            this.setState((prev) => {
                return {
                    unwarpedImageUrl: imageUrl
                };
            });
        }
    }
    selectPoint(event) {
        const target = event.target;
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
                    let h = PerspT(cameraPointsUnrolled, selectedPointsUnrolled);
                    let url = `/camera/warpLastPhoto?coeffs=${h.coeffs}`;
                    let res = await fetch(url);
                    if (res.ok) {
                        let blob = await res.blob();
                        let url = URL.createObjectURL(blob);
                        this.setState((prev) => {
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
            this.setState((prev) => {
                return {
                    selectedPoints: prev.selectedPoints.concat(pt)
                };
            }, maybeInitiateWarp);
        }
    }
    renderValue() {
        let maybeGrayed = this.state.valueSet ? '' : 'grayed';
        let value = this.state.extrinsicTransform
            ? this.state.extrinsicTransform.coeffs.toString()
            : '?';
        return (React.createElement("div", { className: `module-value ${maybeGrayed}`, key: `${this.titleKey}-value` }, `Camera(extrinsicTransform: [${value}], ...)`));
    }
    renderContent() {
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        return React.createElement("div", { className: `camera-calibrator content ${maybeHidden}`, key: this.contentKey.toString() },
            React.createElement("div", { className: "help-text" }, "1. Draw a border around the work envelope with the machine (skip if it's already there)."),
            React.createElement("div", { onClick: this.drawBorder.bind(this), className: "button", id: "draw-border" }, "Draw Border"),
            React.createElement("div", { className: "help-text" }, "2. Make sure the camera is stationary, then click on the four corners of the drawn border within the camera feed. Click the points in the following order:"),
            React.createElement("div", { className: "help-text" },
                React.createElement("strong", null, "upper left, upper right, lower right, lower left.")),
            this.photoButton,
            React.createElement("div", { className: "image-thumbnail" },
                React.createElement("img", { src: this.state.unwarpedImageUrl, onClick: this.selectPoint.bind(this), id: "cc-unwarped-feed", alt: "unwarped camera Feed" })),
            React.createElement("div", { className: "help-text" },
                React.createElement("strong", null, this.state.selectedPoints.length),
                " points selected."),
            React.createElement("div", { className: "help-text" }, "3. Check the preview below and press 'Apply' when you are satisfied."),
            React.createElement("div", { className: "image-thumbnail" },
                React.createElement("img", { src: this.state.warpedImageUrl, id: "cc-warped-feed", alt: "warped camera Feed" })),
            this.applyButton);
    }
}
class FaceFinder extends LivelitWindow {
    constructor(props) {
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
        };
        this.photoButton = React.createElement("div", { onClick: this.takePhoto.bind(this), className: "button", id: "take-photo" }, "Take Photo");
        this.acceptButton = React.createElement("div", { className: "button apply-btn", id: "accept-faces" }, "Accept");
    }
    async takePhoto() {
        let imageUrl = await this.camera?.takePhoto();
        if (imageUrl) {
            this.setState((prev) => {
                return {
                    imageTaken: true,
                    imagePath: imageUrl
                };
            }, this.detectRegions);
        }
    }
    expand() {
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
        return new Promise((resolve) => {
            regions.forEach(r => {
                if (this.camera && this.camera.tabletop) {
                    r.drawOnTabletop(this.camera.tabletop);
                }
            });
            let prevRegions;
            this.setState((prevState) => {
                prevRegions = prevState.detectedRegions;
                return {
                    detectedRegions: regions
                };
            }, () => prevRegions.forEach(r => {
                r.clearFromTabletop();
            }));
        });
    }
    async acceptDetectedRegions() {
        return new Promise((resolve) => {
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
        let resultLis = this.state.detectedRegions
            .map((r, idx) => {
            return React.createElement("li", { key: idx }, r.toString());
        });
        return resultLis;
    }
    renderValue() {
        let maybeGrayed = this.state.valueSet ? '' : 'grayed';
        let value = this.state.detectedRegions.length > 0
            ? `Region[]([${this.state.detectedRegions}])`
            : '?';
        return (React.createElement("div", { className: `module-value ${maybeGrayed}`, key: `${this.titleKey}-value` }, value));
    }
    renderContent() {
        let image = this.state.imageTaken
            ? React.createElement("img", { src: this.state.imagePath })
            : React.createElement("div", null);
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        return React.createElement("div", { className: `face-finder content ${maybeHidden}`, key: this.contentKey.toString() },
            this.photoButton,
            React.createElement("div", { className: "image-thumbnail face-finder-thumbnail" }, image),
            React.createElement("div", { className: "bold-text" }, "Faces Found"),
            React.createElement("ul", { className: "face-list" }, this.renderResults()),
            this.acceptButton);
    }
}
class ToolpathDirectManipulator extends LivelitWindow {
    constructor(props) {
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
class CamCompiler extends LivelitWindow {
    constructor(props) {
        super(props);
        this.titleText = 'CAM Compiler';
        this.functionName = '$camCompiler';
        this.applyButton = React.createElement("div", { className: "button apply-btn", id: "done-cam-compiler" }, "Done");
        this.compilers = [
            {
                name: 'Axidraw EBB Compiler',
                geometryInput: 'SVG',
                isaOutput: 'EBB'
            },
            {
                name: 'Jasper\'s Wacky Slicer',
                geometryInput: 'STL',
                isaOutput: 'g-Code'
            }
        ];
        let maybeSavedToolpath = this.loadSavedValue();
        this.state = {
            currentCompilerName: 'Axidraw EBB Compiler',
            machine: new verso.Machine('TEMP'),
            geometry: undefined,
            toolpath: maybeSavedToolpath,
            windowOpen: props.windowOpen,
            abortOnResumingExecution: false,
            valueSet: !!maybeSavedToolpath
        };
    }
    async setArguments(machine, geometry) {
        return new Promise((resolve) => {
            this.setState(_ => {
                return {
                    machine: machine,
                    geometry: geometry
                };
            }, () => {
                this.generateToolpathWithCurrentCompiler()
                    .then((toolpath) => {
                    this.setState((prevState) => {
                        return { toolpath: toolpath };
                    }, resolve);
                });
            });
        });
    }
    expand() {
        let s = `async function ${this.functionName}(machine, geometry) {`;
        s += `let cc = PROGRAM_PANE.getLivelitWithName(\'${this.functionName}\');`;
        s += `let toolpath;`;
        s += `if (!cc.state.valueSet) {`;
        s += `await cc.setArguments(machine, geometry);`;
        s += `await cc.openWindow();`;
        s += `toolpath = await cc.acceptToolpath();`;
        s += `await cc.saveValue();`;
        s += `await cc.closeWindow();`;
        s += `return toolpath;`;
        s += `}`;
        s += `else {`;
        s += `toolpath = cc.state.toolpath;`;
        s += `}`;
        s += `return toolpath;`;
        s += `}`;
        return s;
    }
    saveValue() {
        if (this.state.abortOnResumingExecution) {
            return;
        }
        return new Promise((resolve) => {
            if (this.state.toolpath) {
                let serializedToolpath = JSON.stringify(this.state.toolpath, undefined, 2);
                localStorage.setItem(this.functionName, serializedToolpath);
                this.setState(_ => {
                    return {
                        valueSet: true
                    };
                }, resolve);
            }
            ;
        });
    }
    loadSavedValue() {
        let serializedToolpath = localStorage.getItem(this.functionName);
        if (serializedToolpath) {
            let revivedTp = JSON.parse(serializedToolpath);
            let toolpath = new verso.Toolpath(revivedTp.geometryUrl, revivedTp.instructions);
            return toolpath;
        }
        else {
            return undefined;
        }
    }
    clearSavedValue() {
        return new Promise((resolve) => {
            localStorage.removeItem(this.functionName);
            this.setState(_ => {
                return {
                    toolpath: undefined,
                    valueSet: false
                };
            }, resolve);
        });
    }
    async generateToolpathWithCurrentCompiler() {
        // TODO: find the correct compiler to use, for now assume Axidraw.
        // return early if we cannot find an appropriate compiler
        // for the current machine.
        return new Promise((resolve, reject) => {
            if (!this.state.geometry) {
                throw new Error('Geometry not set');
            }
            this.state.machine
                .compileGeometryToToolpath(this.state.geometry)
                .then((toolpath) => resolve(toolpath));
        });
    }
    async acceptToolpath() {
        return new Promise((resolve, reject) => {
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
    setCurrentCompiler(event) {
        let compilerItemDom = event.target;
        let compilerName = compilerItemDom.dataset.compilerName;
        if (compilerName) {
            this.generateToolpathWithCurrentCompiler().
                then((toolpath) => {
                this.setState((prevState) => {
                    return {
                        currentCompilerName: compilerName,
                        toolpath: toolpath
                    };
                });
            });
        }
    }
    renderCompilers() {
        let compilerDoms = this.compilers.map((compiler) => {
            let maybeHighlight = compiler.name === this.state.currentCompilerName
                ? 'highlight' : '';
            return (React.createElement("div", { className: `cam-compiler-item ${maybeHighlight}`, "data-compiler-name": compiler.name, onClick: this.setCurrentCompiler.bind(this) },
                React.createElement("span", { className: "compiler-name param-key", "data-compiler-name": compiler.name }, compiler.name),
                React.createElement("span", { className: "geometry-input param-value", "data-compiler-name": compiler.name }, compiler.geometryInput),
                React.createElement("span", { className: "isa-output param-value", "data-compiler-name": compiler.name }, compiler.isaOutput)));
        });
        return (React.createElement("div", { id: "cam-compiler-list", className: "boxed-list" }, compilerDoms));
    }
    renderToolpathInstructions() {
        let instElements = [];
        if (this.state.toolpath) {
            instElements = this.state.toolpath.instructions
                .map((inst, idx) => {
                return (React.createElement("div", { className: `inst-list-item`, key: idx }, inst));
            });
        }
        return (React.createElement("div", { id: "inst-list", className: "boxed-list" }, instElements));
    }
    renderValue() {
        let grayedIffUnset = this.state.valueSet ? '' : 'grayed';
        let hiddenIffUnset = this.state.valueSet ? '' : 'hidden';
        let display = `Toolpath(...) from ${this.state.currentCompilerName}`;
        return (React.createElement("div", { className: `module-value ${grayedIffUnset}`, key: `${this.titleKey}-value` }, display));
    }
    renderContent() {
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        return (React.createElement("div", { className: `cam-compiler content ${maybeHidden}` },
            this.renderCompilers(),
            this.renderToolpathInstructions(),
            this.applyButton));
    }
}
class ToolpathVisualizer extends LivelitWindow {
    constructor(props) {
        super(props);
        this.titleText = 'Toolpath Visualizer';
        this.functionName = '$toolpathVisualizer';
        this.applyButton = React.createElement("div", { className: "button apply-btn", id: "done-toolpath-visualizer" }, "Done");
        this.state = {
            machine: new verso.Machine('TEMP'),
            toolpath: new verso.Toolpath('', []),
            tabletop: undefined,
            windowOpen: props.windowOpen,
            abortOnResumingExecution: false,
            valueSet: props.valueSet,
            selectedInstIndex: -1
        };
    }
    async setArguments(machine, toolpath, tabletop) {
        return new Promise((resolve) => {
            this.setState(_ => {
                return {
                    machine: machine,
                    toolpath: toolpath,
                    tabletop: tabletop
                };
            }, resolve);
        });
    }
    expand() {
        let s = `async function ${this.functionName}(machine, toolpath, tabletop) {`;
        s += `let td = PROGRAM_PANE.getLivelitWithName(\'${this.functionName}\');`;
        s += `await td.setArguments(machine, toolpath, tabletop);`;
        s += `await td.openWindow();`;
        s += `await td.finishDeployment();`;
        s += `await td.closeWindow();`;
        s += `}`;
        return s;
    }
    async finishDeployment() {
        return new Promise((resolve) => {
            const doneDom = document.getElementById('done-toolpath-visualizer');
            if (doneDom) {
                doneDom.addEventListener('click', (event) => {
                    resolve();
                });
            }
        });
    }
    basicViz(toolpath) {
        if (!this.state.tabletop) {
            throw new Error('Cannot visualize without tabletop linked.');
        }
        let vizPath = new paper.Path({
            strokeWidth: 1,
            strokeColor: new paper.Color(0x0000ff)
        });
        let getXyMmChangeFromABSteps = (aSteps, bSteps) => {
            let x = 0.5 * (aSteps + bSteps);
            let y = -0.5 * (aSteps - bSteps);
            // TODO: read this from an EM instruction
            let stepsPerMm = 80;
            return new paper.Point(mm(x / stepsPerMm), mm(y / stepsPerMm));
        };
        let currentPosition = new paper.Point(this.state.tabletop.workEnvelope.anchor.x, this.state.tabletop.workEnvelope.anchor.y);
        let newPosition;
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
    colorViz(toolpath) {
        if (!this.state.tabletop) {
            throw new Error('Cannot visualize without tabletop linked.');
        }
        let vizGroup = new paper.Group();
        let getXyMmChangeFromABSteps = (aSteps, bSteps) => {
            let x = 0.5 * (aSteps + bSteps);
            let y = -0.5 * (aSteps - bSteps);
            // TODO: read this from an EM instruction
            let stepsPerMm = 80;
            return new paper.Point(mm(x / stepsPerMm), mm(y / stepsPerMm));
        };
        let currentPosition = new paper.Point(this.state.tabletop.workEnvelope.anchor.x, this.state.tabletop.workEnvelope.anchor.y);
        let currentColor = 'green';
        let newPosition;
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
                    segments: [seg0, seg1],
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
    velocityThicknessViz(toolpath) {
        if (!this.state.tabletop) {
            throw new Error('Cannot visualize without tabletop linked.');
        }
        let vizGroup = new paper.Group();
        let getXyMmChangeFromABSteps = (aSteps, bSteps) => {
            let x = 0.5 * (aSteps + bSteps);
            let y = -0.5 * (aSteps - bSteps);
            // TODO: read this from an EM instruction
            let stepsPerMm = 80;
            return new paper.Point(mm(x / stepsPerMm), mm(y / stepsPerMm));
        };
        let currentPosition = new paper.Point(this.state.tabletop.workEnvelope.anchor.x, this.state.tabletop.workEnvelope.anchor.y);
        let newPosition;
        let axidrawMaxMMPerSec = 380;
        let maxStrokeWidth = 20;
        let tokens, opcode, duration, aSteps, bSteps, xyChange;
        toolpath.instructions.forEach((instruction) => {
            tokens = instruction.split(',');
            opcode = tokens[0];
            if (opcode === 'SM') {
                duration = parseInt(tokens[1]);
                aSteps = parseInt(tokens[2]);
                bSteps = parseInt(tokens[3]);
                xyChange = getXyMmChangeFromABSteps(aSteps, bSteps);
                let durationSec = duration / 100;
                let norm = Math.sqrt(Math.pow(xyChange.x, 2) + Math.pow(xyChange.y, 2));
                let mmPerSec = norm / durationSec;
                let velWidth = (mmPerSec / axidrawMaxMMPerSec) * maxStrokeWidth;
                newPosition = currentPosition.add(xyChange);
                let seg0 = new paper.Segment(currentPosition);
                let seg1 = new paper.Segment(newPosition);
                let newPath = new paper.Path({
                    segments: [seg0, seg1],
                    strokeWidth: velWidth,
                    strokeColor: new paper.Color('white')
                });
                vizGroup.addChild(newPath);
                currentPosition = newPosition;
            }
        });
        return vizGroup;
    }
    toggleViz(event) {
        let vizName = event.target.dataset.vizName;
        let checked = event.target.checked;
        if (!this.state.tabletop
            || !this.state.toolpath
            || !vizName) {
            throw new Error('Tabletop, visualization DOM name, or '
                + 'toolpath not set for visualization.');
        }
        if (!checked) {
            this.state.tabletop.removeVizWithName(vizName);
            return;
        }
        let visualization;
        if (vizName === 'plainMovementLines') {
            visualization = this.basicViz(this.state.toolpath);
        }
        else if (vizName === 'coloredMovementLines') {
            visualization = this.colorViz(this.state.toolpath);
        }
        else if (vizName === 'velocityThicknessLines') {
            visualization = this.velocityThicknessViz(this.state.toolpath);
        }
        else {
            return;
        }
        this.state.tabletop.addVizWithName(visualization, vizName);
    }
    renderToolpathInstructions() {
        let instElements = [];
        if (this.state.toolpath) {
            instElements = this.state.toolpath.instructions
                .map((inst, idx) => {
                let maybeHighlight = this.state.selectedInstIndex === idx
                    ? 'highlight' : '';
                return (React.createElement("div", { className: `inst-list-item ${maybeHighlight}`, key: idx }, inst));
            });
        }
        return (React.createElement("div", { id: "inst-list", className: "boxed-list" }, instElements));
    }
    renderMachineParams() {
        return (React.createElement("div", { id: "machine-param-list", className: "boxed-list" },
            React.createElement("div", { className: "machine-param" },
                React.createElement("span", { className: "param-key" }, "Pen Height"),
                React.createElement("span", { className: "param-value" }, "33mm"))));
    }
    renderVizInterpreters() {
        return (React.createElement("div", { id: "viz-interpreter-list", className: "boxed-list" },
            React.createElement("div", { className: "viz-interpreter-item" },
                React.createElement("input", { type: "checkbox", "data-viz-name": "plainMovementLines", onChange: this.toggleViz.bind(this) }),
                "Plain movement lines"),
            React.createElement("div", { className: "viz-interpreter-item" },
                React.createElement("input", { type: "checkbox", "data-viz-name": "coloredMovementLines", onChange: this.toggleViz.bind(this) }),
                "Colored movement lines"),
            React.createElement("div", { className: "viz-interpreter-item" },
                React.createElement("input", { type: "checkbox", "data-viz-name": "velocityThicknessLines", onChange: this.toggleViz.bind(this) }),
                "Velocity thickness lines")));
    }
    renderValue() {
        let grayedIffUnset = this.state.valueSet ? '' : 'grayed';
        let hiddenIffUnset = this.state.valueSet ? '' : 'hidden';
        // TODO: have set visualizations modify state and the render... or not
        let display = `Visualization(...)`;
        return (React.createElement("div", { className: `module-value ${grayedIffUnset}`, key: `${this.titleKey}-value` }, display));
    }
    renderContent() {
        let maybeHidden = this.state.windowOpen ? '' : 'hidden';
        return (React.createElement("div", { className: `toolpath-visualizer content ${maybeHidden}`, key: this.contentKey.toString() },
            React.createElement("div", { className: "bold-text" },
                "Machine Parameters (",
                this.state.machine.machineName,
                ")"),
            this.renderMachineParams(),
            React.createElement("div", { className: "bold-text" }, "Instructions"),
            this.renderToolpathInstructions(),
            React.createElement("div", { className: "bold-text" }, "Visualization Interpreters"),
            this.renderVizInterpreters(),
            this.applyButton));
    }
}
export { ProgramPane };
//# sourceMappingURL=program-pane.js.map