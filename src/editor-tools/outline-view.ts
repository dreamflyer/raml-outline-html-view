import {atomUiLib as UI, atom} from "atom-web-ui";

import SC = require("./ScrollViewUI");
import Disposable = UI.IDisposable;
import CompositeDisposable = UI.CompositeDisposable;
import editorTools = require("./editor-tools");

import ramlClientProxy = require("raml-client-proxy");

export enum StructureCategories {
    ResourcesCategory = "Resources" as any,
    SchemasAndTypesCategory = "Schemas & Types" as any,
    ResourceTypesAndTraitsCategory = "Resource Types & Traits" as any,
    OtherCategory = "Other" as any
}

export function getActiveEditor() {
    var activeEditor = atom.workspace.getActiveTextEditor();
    
    if (activeEditor) {
        return activeEditor;
    }

    if (editorTools.aquireManager()) {
        return editorTools.aquireManager().getCurrentEditor();
    }

    return null
}

export class RamlOutline extends SC.Scrollable {
    private _rs: UI.TabFolder;

    private createTree(structure:{[categoryName: string]: any}) {
        this._rs = createTree(structure, sender => {
            if(sender.selection && sender.selection.elements && this.fire == true){
                if (sender.selection.elements.length>0&&sender.selection.elements[0]) {

                    let activeEditor = getActiveEditor();

                    var p1 = activeEditor.getBuffer().positionForCharacterIndex(sender.selection.elements[0].start);
                    var p2 = activeEditor.getBuffer().positionForCharacterIndex(sender.selection.elements[0].end);

                    activeEditor.setSelectedBufferRange({start: p1, end: p2}, {});
                }
            }
        });
        this._viewers = [];

        if (structure)
            this._viewers = [0, 1, 2, 3].map(i=> <UI.TreeViewer<any, any>> this._rs.get(i).content);
    }

    private _viewers: UI.TreeViewer<any,any>[];
    private outlineDataRoot : any;

    constructor() {
        super();

        this.createTree(null);
        (<any>this).addClass('raml-outline');
        this.addChild(this._rs);
    }

    getTitle() { return "Outline"; }

    disposables = new CompositeDisposable();

    _isAttached : boolean;

    private fire : boolean = true;

    private getNodePType(node: any) {
        node.category

        if (node.category == StructureCategories[StructureCategories.ResourcesCategory]) return 0;
        if (node.category == StructureCategories[StructureCategories.SchemasAndTypesCategory]) return 1;
        if (node.category == StructureCategories[StructureCategories.ResourceTypesAndTraitsCategory]) return 2;
        if (node.category == StructureCategories[StructureCategories.OtherCategory]) return 3;

        return 3;
    }

    private _selectedNode: any;

    setSelection(node: any) {
        this._selectedNode = node;

        this.fire = false;
        try {
            var index = this.getNodePType(node);
            var viewer = this._viewers[index];

            if (viewer != null) {
                viewer.setSelection(node);
                this._rs.setSelectedIndex(index);
            }
        }finally {
            this.fire = true;
        }
    }

    // unit: hl.IHighLevelNode;

    unitPath: string;

    setUnit(unitPath: string/*unit:hl.IHighLevelNode*/, force: boolean = false) {
        if (this.unitPath && unitPath && unitPath != this.unitPath) {
            this._children=[];
        }

        this.unitPath = unitPath;

        let activeEditor = getActiveEditor();

        ramlClientProxy.documentChanged({
            uri: unitPath,
            text: activeEditor.getText()
        });

        let structurePromise = ramlClientProxy.getStructure(unitPath);
        if (structurePromise) {
            structurePromise.then(structure=>{

                this.createTree(structure);

                (<any>this).addClass('raml-outline');

                this._children=[];
                this.addChild(this._rs);
                this.html(this.innerRenderUI());
            }).catch(error=>{
                //ignoring, the error is already reported to the log, and we dont need to display
                //it to user in other way
            })
        }

    }

    attach() {
        if (!this._isAttached) {
            var $this = $(this);
            $this.html(this._rs.renderUI().outerHTML);
            this._isAttached = true;
        }
    }

    forEachViewer(command: (viewer: UI.TreeViewer<any, any>) => void) {
        this._viewers.forEach(command);
    }

    refresh() {
        // var unit = this.unit;
        // this.setUnit(null);
        // this.setUnit(unit);

        var unitPath = this.unitPath;
        this.setUnit(null);
        this.setUnit(unitPath);
    }

    destroy (): void {
        editorTools.aquireManager()._view=null;
        // this._selectedNode=null;
        // this.unit=null;
        this.unitPath = null;
        this._viewers=[];
        this._rs=null
        this._children=[];
        this.disposables.dispose()
    }
}

/*
 *
 */
// export function treeSection(input: hl.IParseResult,
//                             name: string,
//                             icon: UI.Icon,
//                             filterFunc: (x:hl.IHighLevelNode)=>boolean,
//                             l: UI.ISelectionListener<any>,
//                             opener: (x:hl.IParseResult)=>void=null) : UI.TreePanel<any,any> {
//
//     var v = UI.treeViewerSection(name,icon,input,x=>getChildren(x).filter(x=>filterFunc(<hl.IHighLevelNode> x)),new HLRenderer(opener));
//
//     v.viewer.setBasicLabelFunction(x=>x ? x.name() : '');
//     v.viewer.setKeyProvider({
//         key:(p:hl.IParseResult):string=>{
//             return ""+p.lowLevel().start();
//         }
//
//     });
//     v.viewer.addSelectionListener(l)
//     return v;
// }

enum HLNodeType {
    Resource,
    Schema,
    Type,
    Trait,
    Unknown
}

// function getNodeType(node: hl.IHighLevelNode): HLNodeType {
//     if (outlineCommon.isResource(node)) return HLNodeType.Resource;
//     else if (outlineCommon.isOther(node)) return HLNodeType.Trait;
//     else if (outlineCommon.isResourceTypeOrTrait(node)) return HLNodeType.Type;
//     else if (outlineCommon.isSchemaOrType(node)) return HLNodeType.Schema;
//     else return HLNodeType.Unknown;
// }

// function isApi(p: hl.IHighLevelNode) {
//     var pc=p.definition().key();
//     return pc===universes.Universe08.Api||pc===universes.Universe10.Api;
// }
// function isDocumentation(p: hl.IHighLevelNode) {
//     var pc=p.definition().key();
//     return ( pc=== universes.Universe08.DocumentationItem||pc===universes.Universe10.DocumentationItem);
// }

function fullStructurePath(model: any) {
    if (!model) return "";

    return model.text;
    // var node = model.getSource();
    // return fullPath(<any>node);
}
//
// function fullPath(node: hl.IParseResult) {
//     if (node == null) return "";
//     else return fullPath(node.parent()) + "/" + node.name();
// }

function simpleTree(input: any, selectionListener: UI.ISelectionListener<any>, categoryName:string, opener: (x: any)=>void=null) {
    var viewer = UI.treeViewer<any>((x: any)=>{
        return <any[]>x.children;
    }, new HLRenderer(opener), fullStructurePath);

    viewer.setBasicLabelFunction(x=>x.text);
    viewer.setKeyProvider({ key: (x:any)=>{return x.key} });
    viewer.addSelectionListener(selectionListener);

    viewer.getBinding().set(input);

    return viewer;
}

export function createTree(structure:{[categoryName: string]: any},
                           selectionListener: (e : UI.SelectionChangedEvent<any>) => void,
                           opener: (x: any) => void = null) {

    if (!structure) {
        return new UI.TabFolder();
    }

    var resourcesModel = structure[StructureCategories[StructureCategories.ResourcesCategory]];
    var typesModel = structure[StructureCategories[StructureCategories.SchemasAndTypesCategory]];
    var traitsModel = structure[StructureCategories[StructureCategories.ResourceTypesAndTraitsCategory]];
    var otherModel = structure[StructureCategories[StructureCategories.OtherCategory]];

    // var resourcesModel = p!=null?ramlOutline.getStructure(outlineCommon.ResourcesCategory):null;
    // var typesModel = p!=null?ramlOutline.getStructure(outlineCommon.SchemasAndTypesCategory):null;
    // var traitsModel = p!=null?ramlOutline.getStructure(outlineCommon.ResourceTypesAndTraitsCategory):null;
    // var otherModel = p!=null?ramlOutline.getStructure(outlineCommon.OtherCategory):null;

    var outline = resourcesModel!=null? simpleTree(resourcesModel, { selectionChanged: selectionListener },
            StructureCategories[StructureCategories.ResourcesCategory], opener):null;
    var schemas = typesModel!=null? simpleTree(typesModel, { selectionChanged: selectionListener },
            StructureCategories[StructureCategories.SchemasAndTypesCategory], opener):null;
    var types   = traitsModel!=null? simpleTree(traitsModel, { selectionChanged: selectionListener },
            StructureCategories[StructureCategories.ResourceTypesAndTraitsCategory], opener):null;
    var other  = otherModel!=null? simpleTree(otherModel, { selectionChanged: selectionListener },
            StructureCategories[StructureCategories.OtherCategory], opener):null;

    var folder = new UI.TabFolder();

    folder.add(StructureCategories[StructureCategories.ResourcesCategory],
        UI.Icon.SEARCH, outline, 'raml-icon-custom');
    folder.add(StructureCategories[StructureCategories.SchemasAndTypesCategory],
        UI.Icon.SEARCH, schemas, 'raml-icon-custom');
    folder.add(StructureCategories[StructureCategories.ResourceTypesAndTraitsCategory],
        UI.Icon.SEARCH, types, 'raml-icon-custom');
    folder.add(StructureCategories[StructureCategories.OtherCategory],
        UI.Icon.SEARCH, other, 'raml-icon-custom');

    folder.setSelectedIndex(0)

    folder.setOnSelected(()=>{
        var selectedTab : any = folder.selectedComponent();
        if (selectedTab) {
            var selection = selectedTab.getSelection();
            if (selection && selection.elements && selection.elements.length > 0) {
                selectionListener(new UI.SelectionChangedEvent(selectedTab, null, selection));
            }

            selectedTab.customizePanel(true);
        }
    })
    return folder;
}


export class HLRenderer implements UI.ICellRenderer<any>{

    constructor(private opener: (x: any) => void) {

    }

    private iconNameToIconEnum(iconName : string) : UI.Icon {
        if (!iconName) return null;

        return UI.Icon[iconName];
    }

    private textHighlightNameToTextClass(highlightName : string) : UI.TextClasses {
        if (!highlightName) return null;

        return UI.TextClasses[highlightName];
    }

    render(model: any): UI.BasicComponent<any> {
        try {

            // if (ramlOutline.isTypedStructureNode(model)
            //     && (<ramlOutline.TypedStructureNode>model).type
            //     && (<ramlOutline.TypedStructureNode>model).type == ramlOutline.NodeType.ATTRIBUTE) {
            //
            //     var attr = <hl.IAttribute>(<any>model.getSource());
            //
            //     //TODO check if we really need custom selection here, otherwise the whole "is attribute" condition is redundant
            //     return UI.hc(UI.label(model.text), UI.a("", x=> {
            //         var p1 = editorTools.aquireManager().getCurrentEditor().
            //             getBuffer().positionForCharacterIndex(attr.lowLevel().start());
            //         var p2 = editorTools.aquireManager().getCurrentEditor().
            //             getBuffer().positionForCharacterIndex(attr.lowLevel().end());
            //         editorTools.aquireManager().getCurrentEditor().setSelectedBufferRange({ start: p1, end: p1 }, {});
            //
            //     }, UI.Icon.ARROW_SMALL_LEFT, null, null));
            //
            // }

            var icon = UI.Icon.DASH;
            var highLight = UI.TextClasses.NORMAL;

            if (this.iconNameToIconEnum(model.icon)) {
                icon = this.iconNameToIconEnum(model.icon);
            }

            if (this.textHighlightNameToTextClass(model.textStyle)) {
                highLight = this.textHighlightNameToTextClass(model.textStyle);
            }

            var extraText="";
            var extraClass=UI.TextClasses.NORMAL;

            var hc=UI.hc(UI.label(model.text, icon, highLight))

            if (model.typeText){
                hc.addChild(UI.label(model.typeText, UI.Icon.NONE, UI.TextClasses.WARNING).margin(2,0,0,0));
            }

            // if (model.getSource().lowLevel().unit()!=model.getSource().root().lowLevel().unit()){
            //     highLight=UI.TextClasses.SUBTLE;
            //     hc.addChild(UI.label("("+model.getSource().lowLevel().unit().path()+")",UI.Icon.NONE,highLight).margin(5,0,0,0));
            // }

            hc.addClass("outline");
            return hc;
        } catch (e) {
            console.log(e);
            return UI.hc(UI.label("Illegal node", UI.Icon.ARROW_SMALL_LEFT, null, null));
        }
    }
}
