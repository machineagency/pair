/// <reference path="lib/three-types/index.d.ts" />

interface VisualizationSpaceProps {};
interface VisualizationSpaceState {};

class VisualizationSpace extends React.Component {
    constructor(props: VisualizationSpaceProps) {
        super(props)
    }

    render() {
        return (
            <div id="visualization-space"></div>
        );
    }
}

export { VisualizationSpace }
