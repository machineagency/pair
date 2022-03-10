import { Geometry } from './verso.js'

class Cam {
    protected geometry: Geometry;
    private svg?: XMLDocument;

    constructor(geometry: Geometry) {
        this.geometry = geometry;
        if (geometry.filepath) {
            this.loadSvgTextFromUrl(geometry.filepath);
        }
        else {
            console.error('Could not load geometry data into CAM object.');
        }
    }

    async loadSvgTextFromUrl(url: string): Promise<XMLDocument> {
        return new Promise<XMLDocument>((resolve, reject) => {
            fetch(url)
                .then(response => response.text())
                .then((text) => {
                    let domParser = new DOMParser();
                    let parseFlag: DOMParserSupportedType = 'image/svg+xml';
                    let svg = domParser.parseFromString(text, parseFlag);
                    resolve(svg);
                })
                .catch((error) => {
                    console.log(error);
                    reject();
                });
        });
    }
}

export { Cam }
