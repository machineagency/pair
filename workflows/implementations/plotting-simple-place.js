let machine = new verso.Machine('axidraw');
// TODO: pen up calibrator with preview
let tabletop = await $tabletopCalibrator(machine);
let camera = await $cameraCalibrator(tabletop);
let geometry = await $geometryGallery(machine, tabletop);
// TODO: use either camera or toolpath direct manipulator
let point = new verso.Point(mm(75), mm(25));
geometry.placeAt(point, tabletop);
let toolpath = await $camCompiler(machine, geometry);
let vizSpace = new verso.VisualizationSpace();
vizSpace = await $toolpathVisualizer(machine, toolpath, vizSpace);
