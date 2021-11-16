import { inflateUI } from "./ui-root.js";
import * as pair from './pair.js';

const main = () => {
    inflateUI();
};

window.onload = function() {
    (window as any).pair = pair;
    main();
}
