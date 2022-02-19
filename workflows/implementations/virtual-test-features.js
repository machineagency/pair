let machine = new verso.Machine('axidraw');
let tabletop = new verso.Tabletop(machine);
let camera = new verso.Camera(tabletop);
let mustache = new verso.Geometry(tabletop);
mustache.loadFromFilepath('mustache.svg', './toolpaths/mustache.svg');
let faceRegions = await camera.findFaceRegions();
let faceCentroids = faceRegions.map(r => r.centroid);
let toolpaths = faceCentroids.map(c => mustache.placeAt(c, tabletop));
