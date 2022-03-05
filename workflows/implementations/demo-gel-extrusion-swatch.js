let machine = new verso.Machine('axidraw');
let tabletop = await $tabletopCalibrator(machine);
let camera = await $cameraCalibrator(tabletop);
console.log('hello, Danli');
