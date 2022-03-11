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
machine = await $machineInitializer(machine);
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
let toolpathGenerator = (geom) => {
    return new verso.Toolpath('temp', [
        'EM,1,1',
        'SM,26,34,67',
        'SM,27,67,134',
        'SM,26,101,200',
        'SM,26,134,268',
        'SM,27,169,334',
        'SM,390,2990,5945',
        'SM,27,169,334',
        'SM,26,134,268',
        'SM,26,101,200',
        'SM,27,67,134',
        'SM,26,34,67',
        'SP,0,200',
        'SM,33,44,44',
        'SM,33,88,88',
        'SM,67,270,270',
        'SM,27,78,78',
        'SM,26,49,49',
        'SM,27,-49,49',
        'SM,26,-78,78',
        'SM,68,-275,275',
        'SM,27,-78,78',
        'SM,27,-49,49',
        'SM,27,-49,-49',
        'SM,26,-78,-78',
        'SM,68,-275,-275',
        'SM,27,-78,-78',
        'SM,27,-49,-49',
        'SM,27,49,-49',
        'SM,26,78,-78',
        'SM,67,270,-270',
        'SM,33,88,-88',
        'SM,33,44,-44',
        'SP,1,133',
        'SM,26,-34,-67',
        'SM,27,-67,-134',
        'SM,26,-101,-200',
        'SM,26,-134,-268',
        'SM,27,-169,-334',
        'SM,390,-2990,-5945',
        'SM,27,-169,-334',
        'SM,26,-134,-268',
        'SM,26,-101,-200',
        'SM,27,-67,-134',
        'SM,26,-34,-67',
    ]);
};
let toolpaths = geometries.map((geometry) => toolpathGenerator(geometry));
// Visualize each toolpath.
let vizSpace = new verso.VisualizationSpace();
toolpaths.forEach((toolpath) => {
    // Can get away without await here because this call mutates state which
    // is not ideal, but it works.
    $toolpathVisualizer(machine, toolpath, vizSpace);
});
// Pick which toolpath to try and dispatch.
await $dispatcher(machine, toolpaths);
