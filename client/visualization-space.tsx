/// <reference path="lib/three-types/index.d.ts" />

interface VisualizationSpaceProps {};
interface VisualizationSpaceState {};

class VisualizationSpace extends React.Component {
    scene: THREE.Scene;
    camera: THREE.Camera;
    controls?: THREE.OrbitControls;
    threeRenderer?: THREE.Renderer;
    envelopeGroup: THREE.Group;
    vizGroup: THREE.Group;

    constructor(props: VisualizationSpaceProps) {
        super(props);
        this.scene = this.initScene();
        this.camera = this.initCamera(this.scene, true);
        this.envelopeGroup = this.createEnvelopeGroup();
        this.vizGroup = new THREE.Group();
        this.scene.add(this.envelopeGroup);
        this.scene.add(this.vizGroup);
        let exampleToolpath = this.createExampleToolpath();
        this.vizGroup.add(exampleToolpath);
        // For debugging
        (window as any).vs = this;
    }

    addVizWithName(vizGroup: THREE.Group, interpreterName: string) {
        vizGroup.name = interpreterName;
        this.vizGroup.add(vizGroup);
    }

    removeAllViz() {
        // TODO: cast as THREE.Mesh and call dispose on geom and mat
        this.vizGroup.children.forEach((child: THREE.Object3D) => {
            child.remove();
        });
        this.vizGroup.children = [];
    }

    createExampleToolpath() {
        let line = new THREE.LineCurve3(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(100, 100, 40),
        );
        let geom = new THREE.TubeBufferGeometry(line, 64, 1, 64, false);
        let material = new THREE.MeshToonMaterial({
            color: 0xe44242,
            side: THREE.DoubleSide
        });
        let mesh = new THREE.Mesh(geom, material);
        return mesh;
    }

    componentDidMount() {
        this.threeRenderer = this.initThreeRenderer();
        this.controls = this.initControls(this.camera, this.threeRenderer);
        let animate = () => {
            let maxFramerate = 20;
            setTimeout(() => {
                requestAnimationFrame(animate);
            }, 1000 / maxFramerate);
            this.threeRenderScene();
        };
        animate();
    }

    initScene() {
        let scene = new THREE.Scene();
        scene.background = new THREE.Color(0x23241f);
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
            camera.zoom = 0.95;
            camera.updateProjectionMatrix();
            camera.frustumCulled = false;
            camera.position.set(-500, 500, 500); // I don't know why this works
            camera.lookAt(scene.position);
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

    initControls(camera: THREE.Camera, renderer: THREE.Renderer) {
        let controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.rotateSpeed = 1.0;
        controls.zoomSpeed = 0.8;
        controls.panSpeed = 0.8;
        return controls;
    }

    initThreeRenderer() {
        let renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        let maybeDom = document.getElementById('visualization-space');
        if (maybeDom) {
            maybeDom.appendChild(renderer.domElement);
        }
        else {
            throw new Error('bad');
        }
        return renderer;
    }

    threeRenderScene() {
        // this.controls.update();
        // let deltaSeconds = this.clock.getDelta();
        // this.mixers.forEach((mixer) => {
        //     mixer.update(deltaSeconds);
        // });
        this.threeRenderer?.render(this.scene, this.camera);
    }

    createEnvelopeGroup() : THREE.Group {
        let dimensions = {
            width: 280,
            height: 50,
            length: 180
        };
        let whitesmoke = 0xf5f5f5;
        let boxGeom = new THREE.BoxBufferGeometry(dimensions.width,
                    dimensions.height, dimensions.length, 2, 2, 2);
        let edgesGeom = new THREE.EdgesGeometry(boxGeom);
        let material = new THREE.LineDashedMaterial({
            color : whitesmoke,
            linewidth: 1,
            scale: 1,
            dashSize: 3,
            gapSize: 3
        });
        let mesh = new THREE.LineSegments(edgesGeom, material);
        mesh.computeLineDistances();
        let envelopeGroup = new THREE.Group();
        envelopeGroup.add(mesh);
        return envelopeGroup;
    }

    render() {
        return (
            <div id="visualization-space"></div>
        );
    }
}

export { VisualizationSpace }
