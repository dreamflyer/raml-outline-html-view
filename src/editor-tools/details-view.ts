import {atomUiLib as UI} from "atom-web-ui";
import SC=require("./ScrollViewUI")
import CompositeDisposable = UI.CompositeDisposable
import details=require("./details")
import editorTools=require("./editor-tools")
import _=require("underscore")

import {
    Reconciler
} from "./reconciler"

import logger = require("./logger");

import ramlClientProxy = require("raml-client-proxy");

export class RamlDetails extends SC.Scrollable {

    private reconciler: Reconciler;

    constructor(private allowStructureChanges: boolean = true) {
        super();
        (<any>this).addClass('raml-details');

        ramlClientProxy.onDetailsReport(report=>this.onDetailsReport(report))

        this.reconciler = new Reconciler(logger.get(), 800);
    }

    getTitle() {
        return "Details";
    }

    disposables = new CompositeDisposable();

    _isAttached: boolean;

    // private _node:hl.IHighLevelNode;
    private _unitPath: string;
    private _position: number;

    container: UI.Panel;
    attached(){
        try {
            this.element.innerHTML="<div></div>";
            this._children=[];
            this.container = UI.vc();
            this.addChild(this.container);
            this.ui().appendChild(this.container.ui());
            super.attached();
        } catch (e){

        }
    }

    wasSchema:boolean;
    
    schemaView:UI.BasicComponent<any>;
    
    private setResource(detailsNode: any, context: any) {
        if (this.wasSchema){
            this.schemaView.dispose();
            this.schemaView=null;
        }
        this.wasSchema=false;

        window["detailsnode"] = detailsNode;
        window["detailscontext"] = context;

        if (detailsNode == null) this.displayEmpty();
        details.updateDetailsPanel(detailsNode, context, this.container, true);
    }

    update() {
        if(window["detailsnode"]) {
            this.setResource(window["detailsnode"], window["detailscontext"]);
        }
    }

    displayEmpty() {
        this.container.clear();
    }

    destroy (): void {
        editorTools.aquireManager()._details=null;
        this.disposables.dispose();
        this._unitPath=null;
        this._position=null;
        this.container.dispose();
        this.container=null;
        window["detailsnode"]=null;
        window["detailscontext"]=null;
        this._children=[];
        if (details.oldItem){
            details.oldItem.detach();
        }
        if (this.wasSchema){
            this.schemaView.dispose();
            this.schemaView=null;
        }
        details.oldItem=null;
    }

    show(unitPath: string, position: number, force: boolean = false) {
        if (!force && this._unitPath == unitPath && this._position === position) return;
        this._unitPath = unitPath;
        this._position = position;
        const reconciler = this.reconciler;

        try {

            ramlClientProxy.getDetails(unitPath, position).then(detailsNode=>{
                this.setResource(detailsNode, {
                    uri: unitPath,
                    position: position,
                    localModel: false,
                    reconciler
                });
            })

        } catch (e) {}
    }

    onDetailsReport(report : any) {
        if (report.uri != this._unitPath) return;
        const reconciler = this.reconciler;
        ramlClientProxy.getLatestVersion(report.uri).then(latestVersion => {
            if (report.version != null && report.version < latestVersion) return;

            this.setResource(report.details, {
                uri: report.uri,
                position: report.position,
                localModel: false,
                reconciler
            });
        })
    }
}