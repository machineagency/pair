interface Props {};
interface State {};

const e = React.createElement;

class LivelitWindow extends React.Component<Props, State> {
    titleText: string;
    
    constructor(props: Props) {
        super(props);
        this.titleText = 'Livelit Window';
    }

    render() {
        const eTitle = () => {
            return e(
                'div',
                { class: 'title'},
                this.titleText
            );
        };
        const eContent = () => {
            return e(
                'div',
                { class: 'content'}
            );
        };
        return e(
            'div',
            { class: 'livelit-window' },
            [ eTitle(), eContent() ]
        );
    }
};

class GeometryGallery extends LivelitWindow {
    constructor(props: Props) {
        super(props);
        this.titleText = 'Geometry Browser';
    }
}

class PointPicker extends LivelitWindow {
    constructor(props: Props) {
        super(props);
    }
}

export { LivelitWindow, GeometryGallery, PointPicker };
