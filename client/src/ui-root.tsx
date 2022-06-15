import React from 'react';
import ReactDOM from 'react-dom';
import Paper from 'paper';
import { FormatUtil } from './format-util'
import { ProgramPane } from "./program-pane";

const BASE_URL = '';

interface Props {};
interface State {};
interface UIRootProps {
    programPaneRef: React.Ref<ProgramPane>
};
interface UIRootState {
    programPaneRef: React.Ref<ProgramPane>
    currentWorkflowName: string;
    workflowDict: Record<string, string>;
};
interface Workflow {
    progName: string;
    progText: string;
};

class UIRoot extends React.Component<UIRootProps, UIRootState> {
    rerunTimeout: number;

    constructor(props: UIRootProps) {
        super(props);
        this.rerunTimeout = 0;
        this.state = {
            programPaneRef: props.programPaneRef,
            currentWorkflowName: '',
            workflowDict: {}
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
        // Now fetch the workflow text from the server
        this.populateWorkflows();
        programPane.runAllLines();
    }

    async fetchWorkflows() : Promise<Workflow[]> {
        let url = `${BASE_URL}/workflows`;
        let response = await fetch(url);
        if (response.ok) {
           let resJson = await response.json();
           return resJson['workflows'];
        }
        else {
            return [];
        }
    }

    get currentWorkflowText() {
        let key = this.state.currentWorkflowName;
        let maybeWorkflow = this.state.workflowDict[key];
        if (maybeWorkflow) {
            return maybeWorkflow.trim();
        }
        return '';
    }

    populateWorkflows() {
        let programPaneRef = this.state.programPaneRef as React.RefObject<ProgramPane>;
        if (!(programPaneRef && programPaneRef.current)) {
            return;
        }
        let programPane = programPaneRef.current;
        this.fetchWorkflows().then((workflows: Workflow[]) => {
            let workflowDict : Record<string, string> = {};
            workflows.forEach((workflow) => {
                workflowDict[workflow.progName] = workflow.progText;
            });
            this.setState(_ => {
                let currentWorkflowName = localStorage.getItem('currentWorkflowName');
                if (!currentWorkflowName) {
                    currentWorkflowName = Object.keys(workflowDict)[0];
                }
                return {
                    currentWorkflowName: currentWorkflowName,
                    workflowDict: workflowDict
                };
            }, () => {
                let programPaneLines = this.currentWorkflowText;
                this.rerun();
            });
        });
    }

    rerun() {
        let programPaneRef = this.state.programPaneRef as React.RefObject<ProgramPane>;
        if (!(programPaneRef && programPaneRef.current)) {
            return;
        }
        let programPane = programPaneRef.current;
        programPane.runAllLines();
    };

    protected handleWorkflowChange(event: React.ChangeEvent<HTMLSelectElement>) {
        let programPaneRef = this.state.programPaneRef as React.RefObject<ProgramPane>;
        if (!(programPaneRef && programPaneRef.current)) {
            return;
        }
        let programPane = programPaneRef.current;
        let workflowName = event.currentTarget.value;
        this.setState(prevState => {
            return { currentWorkflowName: workflowName };
        }, () => {
            let programPaneLines = this.currentWorkflowText;
            localStorage.setItem('currentWorkflowName', workflowName);
            this.rerun();
        });
    }

    renderWorkflowSelect() {
        let programPaneRef = this.state.programPaneRef as React.RefObject<ProgramPane>;
        if (!(programPaneRef && programPaneRef.current)) {
            return;
        }
        let programPane = programPaneRef.current;
        let options = Object.keys(this.state.workflowDict).map((workflowName) => {
            return (
                <option value={workflowName}
                        key={workflowName}>
                    { workflowName }
                </option>
            );
        });
        return (
            <select id="program-names" name="workflow-select"
                    value={this.state.currentWorkflowName}
                    onChange={this.handleWorkflowChange.bind(this)}>
                { options }
            </select>
        );
    }

    saveWorkflow() {
        let plDoms = Array.from(document.getElementsByClassName('program-line'));
        let text = plDoms.map(dom => (dom as HTMLDivElement).innerText)
                                    .join('\\n');
        let url = `${BASE_URL}/workflows?workflowName=${this.state.currentWorkflowName}`
                    + `&workflowText=${text}`;
        fetch(url, { method: 'PUT' })
        .then((response) => {
            if (response.ok) {
                this.populateWorkflows();
            }
            else {
                console.error(response.statusText);
            }
        })
        .catch((error) => {
            console.error(error);
        });
    }

    render() {
        return (
            <div id="main-container">
                <div id="program-container">
                    <div id="topbar">
                        { this.renderWorkflowSelect() }
                        <div id="workflow-btn-bar">
                            <div id="workflow-save" className="workflow-btn"
                                 onClick={this.saveWorkflow.bind(this)}>
                                Save
                            </div>
                        </div>
                    </div>
                    <ProgramPane loadedWorkflowText={this.currentWorkflowText}
                        ref={this.state.programPaneRef}></ProgramPane>
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
        Paper.setup('main-canvas');
    }

    render() {
        return <canvas id="main-canvas" className="invisible"></canvas>
    }
}

const inflateUI = () => {
    const blankDom = document.querySelector('#root');
    const programPaneRef = React.createRef<ProgramPane>();
    const uiRoot = <UIRoot programPaneRef={programPaneRef}></UIRoot>;
    ReactDOM.render(uiRoot, blankDom);
};

export { inflateUI };
