import './index.css';

import { inflateUI } from "./ui-root";
import * as verso from './verso';

const main = () => {
    inflateUI();
};

window.onload = function() {
    (window as any).verso = verso;
    main();
}
