import atom = require("atom-web-ui/dist/core/atomWrapperWeb");

import path = require("path");

import markOccurrences = require("./markOccurences");

import outlineView = require("./outline-view");
import detailsView = require("./details-view");

import reconciler = require("./reconciler");

import converter = require("./editorConverter");

import logger = require("./logger");

import ramlClientProxy = require("raml-client-proxy");
import {EditorProxy} from "raml-client-proxy/dist/index";
    
export class EditorManager {
    private currentEditor: atom.TextEditor;

    _view: outlineView.RamlOutline;
    _details: detailsView.RamlDetails;
    
    unitPath : string;

    changing: boolean;
    executingCommand: boolean;

    private _initialized: boolean = false;

    private markOccurrencesReconciler;

    opened: boolean = false;

    private currentPosition: number;

    private updateCount: number=0;

    private outlineCount: number=0;

    _cleanOutline=false;

    performanceDebug=true;

    private static DETAILS_SUPPORT = true;

    getPath(): string {
        console.log("ETM::GetPath");
        return this.currentEditor ? this.currentEditor.getPath() : null;
    }

    getCurrentEditor() { return this.currentEditor; }

    constructor(display: boolean = true) {
        manager = window["manager"] = this;

        this.markOccurrencesReconciler = new reconciler.Reconciler(logger.get(), 200);

        atom.workspace.onDidChangeActivePaneItem(e => this.updateEverything(display));

        atom.workspace.observeTextEditors(editor=>{
            editor.onDidDestroy(()=>{

                let path = editor.getPath();

                ramlClientProxy.documentClosed(path);
            })

            editor.onDidChangeCursorPosition(event=>this.cursorChanged(editor, event.newBufferPosition))
        })

        this.updateEverything(display);
        this.addAutoCloseListener();

        this.addListenersForStructure();
    }

    public getCurrentPosition() : number {
        return this.currentPosition;
    }

    private cursorChanged(editor: atom.TextEditor, newBufferPosition: atom.Point) {

        markOccurrences.clearOccurences(editor);

        this.markOccurrencesReconciler.schedule(new markOccurrences.MarkOccurrenceRunnable(editor, newBufferPosition));

        let buffer = editor.getBuffer();
        let pos = buffer.characterIndexForPosition(editor.getCursorBufferPosition());

        ramlClientProxy.positionChanged(manager.unitPath, pos);

        this.currentPosition = pos;
    }

    internalScheduleUpdateViews(count:number){
        this.updateCount=count;
        setTimeout(()=>{
            if (this.updateCount==count){
                this.updateViews();
            }
        },500);
    }

    scheduleViewsUpdate(){
        if (this.fire){
            this.internalScheduleUpdateViews(this.updateCount+1);
        }
    }

    internalScheduleOutlineUpdate(count:number){
        this.outlineCount=count;
        setTimeout(()=>{
            if (this.outlineCount==count){
                this.updateOutline();
            }
        },500);
    }

    scheduleOutlineUpdate(){
        this.internalScheduleOutlineUpdate(this.outlineCount+1);

    }

    private addAutoCloseListener() {
        atom.workspace.onDidDestroyPane(evt=> {
            try {
                var edcount = atom.workspace.getPaneItems().filter(function (e) {
                    return e['softTabs'] != undefined;
                }).length;
                if (edcount == 0) {
                    this.currentEditor=null;

                    if((global as any).cleanCache) {
                        (global as any).cleanCache();
                    }

                    if (atom.workspace.paneForItem(this._view)) atom.workspace.paneForItem(this._view).destroy();
                    if (atom.workspace.paneForItem(this._details)) atom.workspace.paneForItem(this._details).destroy();
                    this.opened = false;
                }
            } catch (e) {
                //TODO REMOVE IT LATER WE NEED TO BE PRETy DEFENSIVE AT THIS MOMENT
                console.log(e)
            }
        });
    }

    private getOrCreateView() {
        if (!this._view) {
            this._view = new outlineView.RamlOutline();
            if (this.unitPath){
                this._view.setUnit(this.unitPath);
            }
            // if (this.ast){
            //     this._view.setUnit(this.ast);
            // }
        }
        return this._view;
    }

    private getDetails() {
        if (!EditorManager.DETAILS_SUPPORT) return null;
        if (!this._details) this._details = new detailsView.RamlDetails();
        return this._details;
    }

    updateDetails() {
        this.getDetails().update();
    }

    reparseAST() {
        if (this.currentEditor) {
            var _path = this.currentEditor.getPath();
            var bf=this.currentEditor.getBuffer();

            this.unitPath = _path;
        }
    }


    isETPane(pane) {
        if (!this._view){
            return;
        }
        var items = pane.getItems();
        return ((EditorManager.DETAILS_SUPPORT && items.indexOf(this.getDetails()) >= 0)
        || items.indexOf(this._view) >= 0);
    }

    display() {
        console.log("ETM::Display");
        var aw = atom.workspace;
        var fpane = atom.workspace.paneForItem(this.getCurrentEditor());
        if (!fpane) return;
        if (!aw.paneForItem(this.getOrCreateView()))
            doSplit(this.getOrCreateView());

        if (EditorManager.DETAILS_SUPPORT) {
            if (!aw.paneForItem(manager.getDetails()))
                doSplit(this.getDetails(), SplitDirections.BOTTOM);
        }

        this.opened = true;
    }

    fire: boolean = true;

    private setViewsDisplayStyle(visible: boolean) {
        if(this._details && (<any>this)._details.element) {
            (<any>this)._details.element.style.display = visible ? null : "none";
        }

        if(this._view && (<any>this)._view.element) {
            (<any>this)._view.element.style.display = visible ? null : "none";
        }
    }

    private isRaml(editor): boolean {
        if(!editor) {
            return false;
        }

        var editorPath = editor.getPath();

        if(!editorPath) {
            return false;
        }

        var extName = path.extname(editorPath);

        if(extName !== '.raml') {
            return false;
        }

        return true;
    }

    private updateEverything(display: boolean = true) {
        var editor = atom.workspace.getActiveTextEditor();

        if(editor) {
            this.setViewsDisplayStyle(this.isRaml(editor));
        }

        if(!editor || editor == this.currentEditor || !this.isRaml(editor)) {
            return;
        }

        this.currentEditor = editor;

        if (this.opened == false && display) this.display();

        if (!(<any>editor).patched) {
            this.addListenersToEditor( editor);
        }

        this.reparseAST();

        var pos = (<any>editor.getBuffer()).characterIndexForPosition(editor.getCursorBufferPosition());

        this.positionUpdated(pos);

        this.scheduleViewsUpdate();
    }

    private addListenersToEditor(cedit) {
        var buffer = cedit.getBuffer();
        buffer.onDidChange(x => {
            try {
                //this.reparseAST();
                var pos = buffer.characterIndexForPosition(cedit.getCursorBufferPosition());
                this.positionUpdated(pos);
                //this.scheduleViewsUpdate();

            } catch (e){
                console.log(e);
            }
        });
        
        this.addListenersOnMove(cedit);
        
        (<any>this.currentEditor).patched = true;
    }

    private addListenersForStructure() {
        ramlClientProxy.onStructureReport(report=>{

            let categoryNames = []
            for(let categoryName in report.structure) categoryNames.push(categoryName);

            let categoryNamesString = categoryNames.join();
            logger.get().debug("Got new structure report with categories "
                + categoryNamesString, "EditorManager", "addListenersForStructure");

            var editor = atom.workspace.getActiveTextEditor();

            if(!editor || !this.isRaml(editor)) {
                return;
            }

            this.updateOutline();
        })
    }

    private addListenersOnMove(cedit) {
        var movingPane=false;
        atom.workspace.onDidAddPaneItem(event=> {
            if (movingPane || this.isETPane(event.pane) == false || event.item == this.getOrCreateView() || (EditorManager.DETAILS_SUPPORT && event.item == this.getDetails())) return event;
            setTimeout(()=> {
                try {
                    var fpane = atom.workspace.paneForItem(cedit);
                    if (fpane) {
                        movingPane = true;
                        event.pane.moveItemToPane(event.item, fpane, null);
                        movingPane = false;
                        fpane.setActiveItem(event.item);
                        fpane.activate();
                    }
                } catch (e) {
                    //TODO REMOVE IT LATER WE NEED TO BE PRETy DEFENSIVE AT THIS MOMENT
                    console.log(e);
                }
            }, 18);
        });

    }
    
    setText(text: string) {
        console.log("ETM::SetText");
        var editor = this.currentEditor;
        if (editor == null) return;
        editor.setText(text);
    }

    private isFromEdgeRow(): boolean {
        var editor = this.getCurrentEditor()

        if(!editor) {
            return false;
        }

        var currentPosition = editor.getCursorBufferPosition();

        if(!currentPosition) {
            return false;
        }

        var currentRow = currentPosition.row;

        var previousRow = (<any>editor).previousRow;

        (<any>editor).previousRow = currentRow;

        if(previousRow === undefined) {
            return false;
        }

        if(previousRow === currentRow) {
            return false;
        }

        if(previousRow === (<any>editor.getBuffer()).getLastRow() || previousRow === 0) {
            return true;
        }
    }

    updateViews() {
        var ds=new Date().getMilliseconds();
        
        if (EditorManager.DETAILS_SUPPORT && this._details) {
            this.getDetails().show(manager.unitPath, manager.currentPosition, this.isFromEdgeRow());
        }
        if (this._view) {
            this.getOrCreateView().setUnit(manager.unitPath);
        }
        
        var d1=new Date().getMilliseconds();
        
        if (this.performanceDebug) {
            console.log("Views update:" + (d1 - ds));
        }
    }

    updateOutline() {
        logger.get().debug("Updating outline", "EditorManager", "updateOutline");
        
        if (this._view) {
            this.getOrCreateView().setUnit(manager.unitPath);
        }
    }

    positionUpdated(newPosition) {
        this.currentPosition = newPosition;
        if (this._details) {
            ramlClientProxy.positionChanged(manager.unitPath, this.currentPosition);
        }
    }

    placeholder: boolean = false;

}

var manager: EditorManager;

export function initEditorTools(editor: EditorProxy, display: boolean = true) {
    if(!manager) {
        var workspace = atom.getWorkspace('outline-container', 'modal-panel-external');

        workspace.setActiveTextEditor(converter.fromClientProxy(editor));

        manager = new EditorManager(display);
    } else if(display) {
        manager.display();
    }
}

export function aquireManager(){
    if (!manager){
        manager=new EditorManager(true);
    }
    return manager;
}

export enum SplitDirections{
    RIGHT,
    LEFT,
    TOP,
    BOTTOM
}

export function doSplit(value:any,dir:SplitDirections=SplitDirections.RIGHT){
    var newPane = null;
    
    var activePane = atom.workspace.getActivePane();
    
    switch(dir) {
        case SplitDirections.BOTTOM:
            newPane= activePane.splitDown({});
            
            break;
        case SplitDirections.TOP:
            newPane= activePane.splitUp({});
            
            break;
        case SplitDirections.LEFT:
            newPane= activePane.splitLeft({});
            
            break;
        case SplitDirections.RIGHT:
            newPane= activePane.splitRight({});
            
            break;
    }
    
    newPane.addItem(value);
    
    if(activePane.id === 'main') {
        activePane.container.style.display = 'none';
    }
    
    return newPane;
}