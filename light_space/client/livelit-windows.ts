interface Props {};
interface State {};

const e = React.createElement;

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
        return e(
            'div',
             {
                className: 'title',
                key: this.titleKey.toString()
             },
            this.titleText
        );
    }

    renderContent() {
        return e(
            'div',
            {
                className: 'content',
                key: this.contentKey.toString()
            }
        );
    }

    render() {
        return e(
            'div',
            { className: this.livelitClassName },
            [ this.renderTitle(), this.renderContent() ]
        );
    }
};

class GeometryGallery extends LivelitWindow {
    constructor(props: Props) {
        super(props);
        this.titleText = 'Geometry Browser';
    }

    renderGalleryItem(itemNumber: number) {
        return e(
            'div',
            {
                className: 'gallery-item',
                key: itemNumber.toString()
            }
        );
    }

    renderContent() {
        const numGalleryItems = 6;
        const galleryItems = [...Array(numGalleryItems).keys()].map(n => {
            return this.renderGalleryItem(n);
        });
        return e(
            'div',
            {
                className: 'content',
                key: this.contentKey.toString()
            },
            e(
                'div',
                { className: 'geometry-browser' },
                galleryItems
            )
        );
    }

    render() {
        return e(
            'div',
            { className: this.livelitClassName },
            [ this.renderTitle(), this.renderContent() ]
        );
    }
}

class PointPicker extends LivelitWindow {
    constructor(props: Props) {
        super(props);
    }
}

export { LivelitWindow, GeometryGallery, PointPicker };
