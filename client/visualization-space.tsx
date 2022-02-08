/// <reference path="lib/three-types/index.d.ts" />

interface VisualizationSpaceProps {};
interface VisualizationSpaceState {};

class VisualizationSpace extends React.Component {
    scene: THREE.Scene;
    camera: THREE.Camera;
    threeRenderer?: THREE.Renderer;

    constructor(props: VisualizationSpaceProps) {
        super(props);
        this.scene = this.initScene();
        this.camera = this.initCamera(this.scene, true);
    }

    componentDidMount() {
        this.threeRenderer = this.initThreeRenderer();
    }

    initScene() {
        let scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf5f6f8);
        let topDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.75);
        let leftDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.50);
        let rightDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.25);
        let ambientLight = new THREE.AmbientLight(0x404040);
        leftDirectionalLight.position.set(-1.0, 0.0, 0.0);
        rightDirectionalLight.position.set(0.0, 0.0, 1.0);
        scene.add(topDirectionalLight);
        scene.add(leftDirectionalLight);
        scene.add(rightDirectionalLight);
        scene.add(ambientLight);
        return scene;
    }

    initCamera(scene: THREE.Scene, isOrtho: boolean) {
        let camera;
        let aspect = window.innerWidth / window.innerHeight;
        let viewSize = 150;
        if (isOrtho) {
            camera = new THREE.OrthographicCamera(-viewSize * aspect,
                viewSize * aspect,
                viewSize, -viewSize, -1000, 10000);
            camera.zoom = 0.35;
            camera.updateProjectionMatrix();
            camera.frustumCulled = false;
            camera.position.set(-500, 500, 500); // I don't know why this works
            camera.lookAt(scene.position);
            camera.position.set(-400, 500, 800); // Pan away to move machine to left
        }
        else {
            let fov = 50;
            camera = new THREE.PerspectiveCamera(fov, aspect, 0.01, 30000);
            camera.lookAt(scene.position);
            camera.position.set(-500, 500, 500);
            camera.updateProjectionMatrix();
        }
        return camera;
    }

    initThreeRenderer() {
        let renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        let maybeDom = document.getElementById('visualization-space');
        if (maybeDom) {
            maybeDom.appendChild(renderer.domElement);
        }
        return renderer;
    }

    render() {
        return (
            <div id="visualization-space"></div>
        );
    }
}

export { VisualizationSpace }
