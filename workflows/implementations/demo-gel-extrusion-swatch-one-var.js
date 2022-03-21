let machine = new verso.Machine('jubilee');
// Home the machine, otherwise the machine state is invalid.
machine = await $machineInitializer(machine);
// Calibrate and generate a tabletop for the setup.
let tabletop = await $tabletopCalibrator(machine);
// Consider a simple test geometry which is a wave.
let baseGeometry = await (new verso.Geometry(tabletop)).loadRemoteFile('wave.svg');
let firstGeometry = baseGeometry.placeAt(new verso.Point(mm(10), mm(10)), tabletop);
let secondGeometry = baseGeometry.placeAt(new verso.Point(mm(40), mm(10)), tabletop);
let firstOperation = new verso.CamOperation({ cutSpeed: 5 });
let secondOperation = new verso.CamOperation({ cutSpeed: 10 });
let tps = await $miniCam([firstGeometry, secondGeometry],
                         [firstOperation, secondOperation]);
let vizSpace = await $toolpathVisualizer(machine, tps);
// Pick which toolpath to try and dispatch.
await $dispatcher(machine, tps);
