let machine = new verso.Machine('axidraw');
let tabletop = await $tabletopCalibrator(machine);
let geometry = await $geometryGallery(tabletop);
let point = new verso.Point(mm(75), mm(25));
geometry = geometry.placeAt(point, tabletop);
let toolpath = await $camCompiler(machine, geometry);
let vizSpace = new verso.VisualizationSpace();
vizSpace = await $toolpathVisualizer(machine, toolpath, vizSpace);
