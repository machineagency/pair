import { ProgramPane } from "./program-pane.js";

interface Props {};
interface State {};

class UIRoot extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
    }

    componentDidMount() {
        (paper as any).setup('main-canvas');
    }

    render() {
        return <div id="main-container">
            <div id="canvas-container">
                <canvas id="main-canvas"></canvas>
            </div>
            <div id="program-container">
                <ProgramPane></ProgramPane>
            </div>
        </div>
    }
}

const inflateUI = () => {
    const blankDom = document.querySelector('#root');
    const uiRoot = <UIRoot></UIRoot>;
    ReactDOM.render(uiRoot, blankDom);
};

export { inflateUI };
