import { inflateUI } from "./ui-root.js";
import * as verso from './verso.js';

const main = () => {
    inflateUI();
};

window.onload = function() {
    (window as any).verso = verso;
    main();
}
