import {atomUiLib as UI, atom} from "atom-web-ui";

import detailElements = require("./detailElements");

export var nodes={
    Api:{
        properties:["title","version","baseUri","mediaType","protocols"],
        actions:[
        ]
    }
    ,
    Resource:{
        properties:["relativeUri","displayName","description","is","type"]
    },
    Method:{
        properties:["method","displayName","description","is","type","protocols","securedBy"]
    }
    ,
    DataElement:{
        properties:["name","displayName","description","default","required"]
    },
    Response:{
        properties:["code","description"]
    }
}
export var filterOut={
    properties:["location","annotations","repeat","locationKind","signature"]

}

var  focusedPropertyName: string = null;
var focusedPosition: number = -1;
var toFocus : UI.TextField = null;

export var oldItem;
export function updateDetailsPanel(detailsReport: any,
                                   context: detailElements.DetailsContext, panel: UI.Panel,
                                   updateTextOnDone: boolean = false) {
    panel.clear();
    var cfg=(<any>atom).config
    var l=(<any>atom).styles.emitter.handlersByEventName;
    var sadd:any[]=[].concat(l['did-add-style-element']);
    var sremove:any[]=[].concat(l['did-remove-style-element']);
    var schange:any[]=[].concat(l['did-update-style-element']);
    var cfgCh:any[]=[].concat(cfg.emitter.handlersByEventName['did-change']);
    var grammars=(<any>atom).grammars.emitter.handlersByEventName;
    var addGrammar:any[]=[].concat(grammars["did-add-grammar"]);
    var updateGrammar:any[]=[].concat(grammars["did-update-grammar"]);
    var emptyGrammarListeners=[].concat((<any>atom).grammars.nullGrammar.emitter.handlersByEventName["did-update"]);
    try {
        var empty = true;

        var item = detailElements.buildItem(detailsReport, context, false);
        // item.addListener(x=> {
        //     editorTools.aquireManager().updateText(null);
        // })
        var rend;
        try {
            rend = item.render({});
        } finally {
            if (oldItem) {
                oldItem.detach();
            }

            oldItem = item;

            if (rend) {
                panel.addChild(rend);
            }

            empty = false;
        }

        if (toFocus) {
            var field = toFocus.getActualField().ui();
            field.focus();
            (<any> field).getModel().setCursorBufferPosition(focusedPosition);
            toFocus = null;
            focusedPosition = null;
            focusedPropertyName = null;
        }

        if (empty) {
            var errLabel = UI.h3("Object has no additional properties.");
            UI.applyStyling(UI.TextClasses.WARNING, errLabel);
            errLabel.setStyle("text-align", "center").margin(0, 0, 24, 12);
            panel.addChild(errLabel);
        }

    } catch(Error){
        throw Error;
    } finally {

        cfg.emitter.handlersByEventName['did-change']=cfgCh;
        l['did-add-style-element']=sadd;
        l['did-remove-style-element']=sremove;
        l['did-update-style-element']=schange;
        grammars["did-add-grammar"]=addGrammar;
        grammars["did-update-grammar"]=updateGrammar;
        (<any>atom).grammars.nullGrammar.emitter.handlersByEventName["did-update"]=emptyGrammarListeners;
    }
}