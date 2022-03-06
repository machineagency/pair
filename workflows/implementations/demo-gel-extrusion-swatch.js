// Declare machine and connect to it.
let machine = new verso.Machine('jubilee');
// Home the machine, otherwise the machine state is invalid.
machine = await $machineInitializer(machine);
// Calibrate and generate a tabletop for the setup.
let tabletop = await $tabletopCalibrator(machine);
// Consider a simple test geometry which is a wave.
let baseGeometry = new verso.Geometry().loadRemoteFile('wave.svg');
// Start with 3 test values a 2-factor grid: velocity and corner radius.
// Eventually these can be generated with a module.
let params = {
    velocities: [3.0, 4.5, 6.0],
    cornerRadii: [1.0, 1.3, 1.6]
};
// Lay the geometries out in a spatial grid.
let margin = 10;
let anchorPoints = params.velocities.keys().map((velocityIndex) => {
    return params.cornerRadii.keys().map((radiusIndex) => {
        return new verso.Point(
            velocityIndex * (baseGeometry.width + margin),
            radiusIndex * (baseGeometry.height + margin)
        );
    });
}).flat();
let geometries = anchorPoints.map((anchor) => {
    return baseGeometry.placeAt(anchor, tabletop);
});
// Given these parameters, generate 6 toolpaths based on the geometry.
let toolpaths = [];
// Visualize each toolpath.
let vizSpace = new verso.VisualizationSpace();
vizSpace = await $toolpathVisualizer(machie, toolpaths, vizSpace);
// Pick which toolpath to try and dispatch.
await $dispatcher(machine, toolpaths);
