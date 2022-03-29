let machine = new verso.Machine('axidraw');
let tabletop = await $tabletopCalibrator(machine);
let geometry = await $geometryGallery(tabletop);
let toolpath = await $axidrawDriver(machine, geometry);
let vizSpace = await $toolpathVisualizer(machine, [toolpath]);
let svg = await $projector(tabletop, vizSpace);
let someInstruction = await $instructionBuilder();
$display(someInstruction);
