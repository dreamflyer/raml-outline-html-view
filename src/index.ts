import ramlClientProxy = require("raml-client-proxy");

import editorConverter = require("./editor-tools/editorConverter");

import {atom} from "atom-web-ui";

import editorTools = require("./editor-tools/editor-tools");

var initialized: boolean = false;

ramlClientProxy.init();

ramlClientProxy.onEditorOpened((editor: ramlClientProxy.EditorProxy) => {
    if(!initialized) {
        editorTools.initEditorTools(editor, true);
        
        initialized = true;
        
        return;
    }
    
    atom.workspace.setActiveTextEditor(editorConverter.fromClientProxy(editor));
    
    atom.workspace.doUpdate();
});