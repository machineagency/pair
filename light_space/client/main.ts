import { inflateProgramPane } from "./program-pane.js";
import * as pair from './pair.js';

const main = () => {
    (paper as any).setup('main-canvas');
    (window as any).tabletop = new pair.Tabletop();
    inflateProgramPane();
};

window.onload = function() {
    (window as any).pair = pair;
    main();
}
