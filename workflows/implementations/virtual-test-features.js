let machine = new verso.Machine('axidraw');
let tabletop = new verso.Tabletop();
let camera = new verso.Camera(tabletop);
let mustache = new verso.Geometry('./toolpaths/mustache.svg');
let faceRegions = await camera.findFaceRegions();
let faceCentroids = faceRegions.map(r => r.centroid);
let toolpaths = faceCentroids.map(c => mustache.placeAt(c, tabletop));
