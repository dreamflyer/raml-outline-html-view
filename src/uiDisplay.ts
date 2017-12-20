import {atomUiLib, atom} from "atom-web-ui";

import ramlClientProxy = require("raml-client-proxy");

import uiBuilder = require("./editor-tools/detailElements");

export function init() {
    ramlClientProxy.onDisplayUi((displayData) => {
        var exports: any = {};
    
        ((exports, UI, IDE, UIBuilder) => {
            eval(displayData.uiCode);
        }).apply({}, [exports, atomUiLib, atom, uiBuilder]);

        switchVisibility(true);
       
        return exports.run(displayData.initialUIState).then(data => {
            switchVisibility(false);

            return data;
        });
    });
}

function switchVisibility(modal : boolean): void {
    document.getElementById("modal-container").style.display = modal ? null : "none";
    document.getElementById("outline-container").style.display = modal ? "none" : null;
}