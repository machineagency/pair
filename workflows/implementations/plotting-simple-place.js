let machine = new verso.Machine('axidraw');
machine = await $machineInitializer(machine);
let tabletop = await $tabletopCalibrator(machine);
let geometry = await $geometryGallery(tabletop);
geometry = geometry.translate(mm(75), mm(25));
let toolpath = await $axidrawDriver(machine, geometry);
let vizSpace = await $toolpathVisualizer(machine, [toolpath]);
await $dispatcher(machine, [toolpath]);
