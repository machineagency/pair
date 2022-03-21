let machine = new verso.Machine('axidraw');
let tabletop = await $tabletopCalibrator(machine);
let geometry = await (new verso.Geometry(tabletop)).loadRemoteFile('nadya-sig.svg');
geometry = geometry.placeAt(new verso.Point(mm(100), mm(50)));
let toolpath = await $axidrawDriver(machine, geometry);
let vizSpace = await $toolpathVisualizer(machine, [toolpath]);
