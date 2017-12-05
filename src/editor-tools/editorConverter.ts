import {atom} from "atom-web-ui";
import ramlClientProxy = require("raml-client-proxy");

export function fromClientProxy(editor: ramlClientProxy.EditorProxy): atom.TextEditor {
    var buffer = <atom.TextBuffer><any>{
        getText: () => editor.getModel().getValue(),
        
        characterIndexForPosition: (position: {row: number, column: number}): number => editor.getModel().getOffsetAt({column: position.column, lineNumber: position.row}),
        
        onDidChange: (callback) => editor.getModel().onDidChangeContent(callback),

        positionForCharacterIndex: (offset: number) => {
            var position = editor.getModel().getPositionAt(offset);

            return {column: position.column, row: position.lineNumber}
        },
        
        setText: (text: string, offset?: number) => {
            editor.setValue(text, offset);
        }
    };
    
    var result =  <atom.TextEditor><any>{
        getPath: () => editor.getModel().uri.toString(),
        
        getBuffer: () => buffer,
        
        getCursorBufferPosition: () => {
            var position = editor.getPosition();
            
            return {column: position.column, row: position.lineNumber}
        },
        
        getText: () => buffer.getText(),

        pane: {},

        setSelectedBufferRange: (data) => {
            editor.setSelection({
                start: {
                    column: data.start.column,
                    lineNumber: data.start.row
                },

                end: {
                    column: data.end.column,
                    lineNumber: data.end.row
                }
            });
        }
    };
    
    return result;
}