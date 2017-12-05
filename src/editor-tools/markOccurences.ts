import atom = require("atom-web-ui/dist/core/atomWrapperWeb");

import ramlClientProxy = require("raml-client-proxy");

export function markOccurences(editor: atom.TextEditor, occurences: atom.Range[]) {
    var layer: any = getOccurencesLayer(editor);

    layer.clear();

    occurences.forEach(occurence => {
        layer.markBufferRange(occurence);
    });

    (<any>editor).decorateMarkerLayer(layer, {
        type: 'highlight',
        class: 'raml-occurence'
    });
}

export function clearOccurences(editor: atom.TextEditor) {
    var layer: any = getOccurencesLayer(editor);

    layer.clear();
}

function getOccurencesLayer(editor: atom.TextEditor): any {
    var layerId = (<any>editor).occurencesLayerId;

    var layer = layerId && (<any>editor).getMarkerLayer(layerId);

    if(!layer) {
        layer = (<any>editor).addMarkerLayer();
    }

    (<any>editor).occurencesLayerId = layer.id;

    return layer;
}

export class MarkOccurrenceRunnable {

    private cancelled = false;
    private offset: number;

    constructor(private editor: atom.TextEditor, private position: atom.Point) {
        this.offset = editor.getBuffer().characterIndexForPosition(position);
    }
    /**
     * Performs the actual business logics.
     * Should resolve the promise when finished.
     */
    run(): Promise<void> {
        return ramlClientProxy.markOccurrences(this.getMarkOccurrencesPath(), this.offset)
            .then(ranges => {

                let currentPosition = this.editor.getCursorBufferPosition();
                if (currentPosition.row != this.position.row || currentPosition.column != this.position.column) {
                    //data is outdated
                    return;
                }

                let bufferRanges: atom.Range[] = ranges.map(range=>{
                    return {
                        start: this.editor.getBuffer().positionForCharacterIndex(range.start),
                        end: this.editor.getBuffer().positionForCharacterIndex(range.end),
                    }
                })
                markOccurences(this.editor, bufferRanges);
            })
    }
    /**
     * Performs the actual business logics synchronously.
     */
    runSynchronously(): void {
    }
    /**
     * Whether two runnable conflict with each other.
     * Must work fast as its called often.
     * @param other
     */
    conflicts(other: any): boolean {
        if (!(<any>other).getMarkOccurrencesPath) return false;

        let otherPath : string = (<any>other).getMarkOccurrencesPath();

        return this.getMarkOccurrencesPath() == otherPath;
    }
    /**
     * Cancels the runnable. run() method should do nothing if launched later,
     * if cancel is called during the run() method execution, run() should stop as soon as it can.
     */
    cancel(): void {
        this.cancelled = true;
    }
    /**
     * Whether cancel() method was called at least once.
     */
    isCanceled(): boolean {
        return this.cancelled;
    }

    getMarkOccurrencesPath() {
        return this.editor.getPath();
    }
}