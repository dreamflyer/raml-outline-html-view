import {atomUiLib as UI} from "atom-web-ui";

export class Scrollable implements UI.UIComponent {

     _children: UI.UIComponent[] = [];

    constructor() {
        this.element = Scrollable.content();
    }
    
    static content(): HTMLElement {
        var result = document.createElement("div");

        result.classList.add("scrollpad");
        result.classList.add("pane-item");
        result.classList.add("padded");

        result.style.overflow = "scroll";
        
        
        return result;
    }
    
    dispose(): void {

    }

    addClass(className: string): void {
        if(!this.element) {
            return;
        }
        
        this.element.classList.add(className);
    }
    
    element:HTMLElement;


    caption(): string {
        return "";
    }

    scroll(top: number, left: number) {
        this.element.scrollTop = top;
        this.element.scrollLeft = left;    
    }

    html(value) {
        this.element.innerHTML = '';
        
        this.element.appendChild(value);
    }
    
    size() {
        return {
            top: this.element.scrollTop,
            left: this.element.scrollLeft,
            bottom: this.element.scrollTop + this.element.clientHeight,
            right: this.element.scrollLeft + this.element.clientWidth
        }
    }

    changed() { }
    refresh() { }

    private _ui: UI.HTMLTypes;
    ui() {
        return this.element;
    }

    private _parent: UI.UIComponent;

    setParent(p: UI.UIComponent) {
        if (this._parent != null)
            this._parent.removeChild(this);

        this._parent = p;
    }

    //TODO REMOVE COPY PASTE
    addChild(child: UI.UIComponent|UI.BasicComponent<any>) {
        child.setParent(this);
        this._children.push(child);
        //this.changed();
    }
    removeChild(child: UI.UIComponent) {
        this._children = this._children.filter(x=> x != child);
        // this.changed();
    }
    doRender() {
        return this.innerRenderUI();
    }
    /**
     *
     * @returns not null element;
     */
    private selfRender(): HTMLElement {
        return <any>document.createElement("div");
    }

    attached() {
        (<any>this).html(this.innerRenderUI())
    }

    innerRenderUI(): HTMLElement {
        var start = this.selfRender();
        this._children.forEach(x=> {
            var el = x.renderUI()
            if (el) {
                start.appendChild(el);
            }
        });

        return start;
    }

    renderUI(): UI.HTMLTypes {
        return this.element;
    }

    parent(): any {
        return null;
    }

    children(): UI.UIComponent[] {
        return this._children;
    }

    isAttached(): boolean {
        return true;
    }
    
    detach() {
        
    }
}