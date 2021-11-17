import { ProgramPane } from "./program-pane.js";

interface Props {};
interface State {};

class UIRoot extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
    }

    render() {
        return (
            <div id="main-container">
                <div id="program-container">
                    <ProgramPane></ProgramPane>
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
        return <canvas id="main-canvas" className="hidden"></canvas>
    }
}

const inflateUI = () => {
    const blankDom = document.querySelector('#root');
    const uiRoot = <UIRoot></UIRoot>;
    ReactDOM.render(uiRoot, blankDom);
};

export { inflateUI };
