import ramlClientProxy = require("raml-client-proxy");
import {atom} from "atom-web-ui";

import editorTools = require("./editor-tools");

export function launchServerActionByID(path: string, actionID: string, position: number): void {

    ramlClientProxy.executeContextActionByID(
        path,
        actionID,
        position
    ).then(changes=>{
        let editorManager = editorTools.aquireManager();
        if (!editorManager) return Promise.resolve([]);

        let path = editorManager.getPath();

        //TODO handle all cases
        for (let change of changes) {
            if (change.uri == path && change.text != null) {

                editorManager.getCurrentEditor().getBuffer().setText(change.text);

                ramlClientProxy.documentChanged({
                    uri: path,
                    text: change.text
                })
            } else if (change.text != null) {
                let editorFound = false;
                atom.workspace.getTextEditors().forEach((currentEditor) => {
                    if (currentEditor.getPath && currentEditor.getPath() == change.uri) {
                        currentEditor.getBuffer().setText(change.text);
                        editorFound = true;
                    }
                });

                if (!editorFound) {
                    // mkdirp.sync(pathModule.dirname(change.uri));
                    // fs.writeFileSync(change.uri, change.text)
                }
            }
        }
    })
}