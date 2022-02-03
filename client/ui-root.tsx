import { ProgramPane } from "./program-pane.js";

interface Props {};
interface State {};
interface UIRootProps {
    programPaneRef: React.Ref<ProgramPane>
};
interface UIRootState {
    programPaneRef: React.Ref<ProgramPane>
};

class UIRoot extends React.Component<UIRootProps, UIRootState> {
    rerunTimeout: number;

    constructor(props: UIRootProps) {
        super(props);
        this.rerunTimeout = 0;
        this.state = {
            programPaneRef: props.programPaneRef
        }
    }

    componentDidMount() {
        // At this point, paper should have already initialized and we should
        // have a valid ref to program pane
        let programPaneRef = this.state.programPaneRef as React.RefObject<ProgramPane>;
        if (!(programPaneRef && programPaneRef.current)) {
            return;
        }
        let programPane = programPaneRef.current;
        programPane.bindNativeConsoleToProgramConsole();
        programPane.generateModules()
        .then(() => {
            programPane.runAllLines();
            this.setProgramLinesContentEditable();
            this.setProgramLinesRerunHandler();
        });
    }

    setProgramLinesContentEditable() {
        let programLinesDom = document.getElementById('program-lines');
        if (programLinesDom) {
            programLinesDom.contentEditable = "true";
            programLinesDom.spellcheck = false;
        }
    }

    setProgramLinesRerunHandler() {
        let programPaneRef = this.state.programPaneRef as React.RefObject<ProgramPane>;
        if (!(programPaneRef && programPaneRef.current)) {
            return;
        }
        let programPane = programPaneRef.current;
        const delay = 1000;
        const rerun = () => {
            programPane.generateModules()
            .then(() => {
                programPane.runAllLines();
            });
        };
        let programLinesDom = document.getElementById('program-lines');
        if (programLinesDom) {
            programLinesDom.addEventListener('keyup', (event: Event) => {
                clearTimeout(this.rerunTimeout);
                this.rerunTimeout = setTimeout(() => {
                    rerun();
                }, delay);
            });
        }
    }

    render() {
        return (
            <div id="main-container">
                <div id="program-container">
                    <ProgramPane ref={this.state.programPaneRef}></ProgramPane>
                </div>
                <div id="canvas-container">
                    <PaperCanvas></PaperCanvas>
                </div>
            </div>
        )
    }
}

// NOTE: this will eventually be moved elsewhere probably as it will need
// to be loaded remotely.
class PaperCanvas extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
    }

    componentDidMount() {
        (paper as any).setup('main-canvas');
    }

    render() {
        return <canvas id="main-canvas" className=""></canvas>
    }
}

const inflateUI = () => {
    const blankDom = document.querySelector('#root');
    const programPaneRef = React.createRef<ProgramPane>();
    const uiRoot = <UIRoot programPaneRef={programPaneRef}></UIRoot>;
    ReactDOM.render(uiRoot, blankDom);
};

export { inflateUI };
