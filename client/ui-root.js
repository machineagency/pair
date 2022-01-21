import { ProgramPane } from "./program-pane.js";
;
;
class UIRoot extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        return (React.createElement("div", { id: "main-container" },
            React.createElement("div", { id: "program-container" },
                React.createElement(ProgramPane, null)),
            React.createElement("div", { id: "canvas-container" },
                React.createElement(PaperCanvas, null))));
    }
}
// NOTE: this will eventually be moved elsewhere probably as it will need
// to be loaded remotely.
class PaperCanvas extends React.Component {
    constructor(props) {
        super(props);
    }
    componentDidMount() {
        paper.setup('main-canvas');
    }
    render() {
        return React.createElement("canvas", { id: "main-canvas", className: "" });
    }
}
const inflateUI = () => {
    const blankDom = document.querySelector('#root');
    const uiRoot = React.createElement(UIRoot, null);
    ReactDOM.render(uiRoot, blankDom);
};
export { inflateUI };
//# sourceMappingURL=ui-root.js.map