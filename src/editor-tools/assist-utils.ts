import {atomUiLib as UI, atom} from "atom-web-ui";
import editorTools = require("./editor-tools");

import ramlClientProxy = require("raml-client-proxy");

function getEditorByUriOrPath(path : string) : any {
    let activeEditor = getActiveEditor();
    if (activeEditor.getPath() == path) return activeEditor;

    return null;
}

function getActiveEditor() : any {
    var activeEditor = atom.workspace.getActiveTextEditor()
    
    if(activeEditor) {
        return activeEditor
    }

    if(editorTools.aquireManager())
        return editorTools.aquireManager().getCurrentEditor()

    return null
}

export function applyChangedDocuments(changedDocuments : any[]) : void {

    for (let changedDocument of changedDocuments) {

        let editor = getEditorByUriOrPath(changedDocument.uri);

        let oldContents = null;
        if (editor) {
            oldContents = editor.getText();
        }

        let newText = null;
        if (changedDocument.text) {
            newText = changedDocument.text;
        } else if (changedDocument.textEdits) {
            newText = ramlClientProxy.applyDocumentEdits(oldContents, changedDocument.textEdits);
        } else {
            continue;
        }

        if (editor) {
            editor.getBuffer().setText(newText);
        }
    }
}

export function applyChangedDocumentsAsync(changedDocuments : any[], newOffset: number) : void {
    var currentContent: string = null;

    var foundEditor;

    changedDocuments.forEach(changedDocument => {
        var editor = getEditorByUriOrPath(changedDocument.uri);

        if(editor) {
            foundEditor = editor;

            currentContent = currentContent === null ? editor.getText() : currentContent;

            if(changedDocument.text || changedDocument.text === "") {
                currentContent = changedDocument.text;
            } else if(changedDocument.textEdits) {
                currentContent = ramlClientProxy.applyDocumentEdits(currentContent, changedDocument.textEdits)
            }
        }
    });
    
    if(foundEditor && (currentContent || currentContent === "")) {
        foundEditor.getBuffer().setText(currentContent, newOffset);
    }
}

export function gotoPosition(position: number): void {
    let activeEditor = getActiveEditor();
    if (!activeEditor) {
        return;
    }

    let bufferPos = activeEditor.getBuffer().positionForCharacterIndex(position);

    activeEditor.setSelectedBufferRange({start: bufferPos, end: bufferPos}, {});
}

