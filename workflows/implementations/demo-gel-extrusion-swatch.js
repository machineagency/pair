// Start with 3 test values a 2-factor grid: velocity and corner radius.
// Eventually these can be generated with a module.
let params = {
    velocities: [3.0, 4.5, 6.0],
    extrusionRates: [2.0, 3.0, 4.0],
    // TODO: generate geometry procedurally with radii
    cornerRadii: [1.0, 1.3, 1.6]
};
// Declare machine and connect to it.
let machine = new verso.Machine('jubilee');
// Home the machine, otherwise the machine state is invalid.
machine = await $machineInitializer (machine);
// Calibrate and generate a tabletop for the setup.
let tabletop = await $tabletopCalibrator(machine);
// Consider a simple test geometry which is a wave.
let baseGeometry = await (new verso.Geometry(tabletop)).loadRemoteFile('wave.svg');
// Lay the geometries out in a spatial grid.
let margin = 10;
let anchorPoints = params.velocities.map((velocity, velocityIndex) => {
    return params.cornerRadii.map((extrusionRate, extrusionRateIndex) => {
        return new verso.Point(
            velocityIndex * (baseGeometry.width + margin),
            extrusionRateIndex * (baseGeometry.height + margin)
        );
    });
}).flat();
let geometries = anchorPoints.map((anchor, anchorIndex) => {
    return baseGeometry.placeAt(anchor, tabletop);
});
// Given these parameters, generate 6 toolpaths based on the geometry.
let testTp = await $miniCam(baseGeometry);
// let toolpaths = geometries.map((geometry) => toolpathGenerator(geometry));
// Visualize each toolpath.
let vizSpace = new verso.VisualizationSpace(machine);
$toolpathVisualizer(machine, testTp, vizSpace);
// Pick which toolpath to try and dispatch.
await $dispatcher(machine, testTp);
