import { inflateUI } from "./ui-root.js";
import * as pair from './verso.js';

const main = () => {
    inflateUI();
};

window.onload = function() {
    (window as any).pair = pair;
    main();
}
