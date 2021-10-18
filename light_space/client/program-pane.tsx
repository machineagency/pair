interface Props {};
interface ProgramLineProps {
    lineNumber: number;
    lineText: string;
};

interface State {};
interface ProgramLineState {
    lineText: string;
};

class ProgramPane extends React.Component<Props, State> {
}

class ProgramLine extends React.Component<ProgramLineProps, ProgramLineState> {
    constructor(props: ProgramLineProps) {
        super(props);
        this.state = {
            lineText: props.lineText
        };
    }

    render() {
        const lineNumber = this.props.lineNumber || 0;
        return <div className="program-line"
                    id={lineNumber.toString()}>
                    {this.state.lineText}
               </div>
    }
}

class LivelitWindow extends React.Component<Props, State> {
    titleText: string;
    livelitClassName: string;
    titleKey: number;
    contentKey: number;

    constructor(props: Props) {
        super(props);
        this.titleText = 'Livelit Window';
        this.livelitClassName = 'livelit-window';
        this.titleKey = 0;
        this.contentKey = 1;
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

class GeometryGallery extends LivelitWindow {
    constructor(props: Props) {
        super(props);
        this.titleText = 'Geometry Browser';
    }

    renderGalleryItem(itemNumber: number) {
        return <div className="gallery-item"
                    key={itemNumber.toString()}>
               </div>;
    }

    renderContent() {
        const numGalleryItems = 6;
        const galleryItems = [...Array(numGalleryItems).keys()].map(n => {
            return this.renderGalleryItem(n);
        });
        return <div className="content"
                    key={this.contentKey.toString()}>
                    <div className="geometry-browser">
                        { galleryItems }
                    </div>
               </div>
    }
}

class PointPicker extends LivelitWindow {
    constructor(props: Props) {
        super(props);
    }
}

const inflateProgramPane = () => {
    const blankDom = document.querySelector('#program-container');
    const livelitWindow = React.createElement(GeometryGallery);
    ReactDOM.render(livelitWindow, blankDom);
};

export { inflateProgramPane };
