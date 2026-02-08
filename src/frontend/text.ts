import './text.css';

type TextPosition = {
    line: number;
    offset: number;
};

type ChangeType = "insertText" | "removeText";

type Change = {
    type: ChangeType;
    text: string;
    position: TextPosition;
};

type RemoveMode = "forward" | "backward";

class History {
    private past: Change[] = [];
    private future: Change[] = [];

    push(change: Change): void {
        this.past.push(change);
        this.future = [];
    }

    canUndo(): boolean {
        return this.past.length > 0;
    }

    canRedo(): boolean {
        return this.future.length > 0;
    }

    undo(): Change | null {
        if (this.past.length === 0) {
            return null;
        }

        const lastChange = this.past.pop();
        this.future.push(lastChange);
        return lastChange;
    }

    redo(): Change | null {
        if (this.future.length === 0) {
            return null;
        }

        const nextChange = this.future.pop();
        this.past.push(nextChange);
        return nextChange;
    }
}

class TextEditor {
    private textNr: HTMLElement;
    private textBody: HTMLElement;
    private history = new History();

    private resizeObserver: ResizeObserver;

    constructor(textNr: HTMLElement, textBody: HTMLElement) {
        this.textNr = textNr;
        this.textBody = textBody;

        this.resizeObserver = new ResizeObserver(entries => {
            this.updateLineNumberHeight();
        });
        this.resizeObserver.observe(this.textBody);

        this.textBody.addEventListener("input", (event: InputEvent) => {
            const nrCells = this.textNr.querySelectorAll<HTMLElement>("div");
            const textCells = this.textBody.querySelectorAll<HTMLElement>("div");

            const nrCount = nrCells.length;
            const lineCount = textCells.length;
            if (lineCount > nrCount) {
                for (let i = nrCount + 1; i <= lineCount; i++) {
                    const nrCell = document.createElement("div");
                    nrCell.textContent = `${i}`;
                    this.textNr.appendChild(nrCell);
                }
            } else if (lineCount < nrCount) {
                for (let i = nrCount; i > lineCount; --i) {
                    this.textNr.removeChild(this.textNr.lastChild);
                }
            }

            this.updateLineNumberHeight();
        });

        textBody.addEventListener("beforeinput", (e: InputEvent): void => {
            e.preventDefault();

            if (e.inputType === "historyUndo") {
                this.undo();
                return;
            }
            if (e.inputType === "historyRedo") {
                this.redo();
                return;
            }

            if (e.inputType === "insertText") {
                this.insertTextAction(e.data);
                return;
            }
            if (e.inputType === "insertParagraph") {
                this.insertTextAction("\n");
                return;
            }

            if (e.inputType === "deleteContentBackward") {
                this.removeTextAction("backward");
                return;
            }
            if (e.inputType === "deleteContentForward") {
                this.removeTextAction("forward");
                return;
            }
        });

        textBody.addEventListener("paste", (e: ClipboardEvent): void => {
            e.preventDefault();

            const plain = e.clipboardData.getData("text/plain");
            this.insertTextAction(plain);
        });

        textBody.addEventListener("drop", e => e.preventDefault());
        textBody.addEventListener("dragover", e => e.preventDefault());
    }

    public updateLineNumberHeight(): void {
        const nrCells = this.textNr.querySelectorAll<HTMLElement>("div");
        const textCells = this.textBody.querySelectorAll<HTMLElement>("div");

        for (let i = 0; i < textCells.length; i++) {
            const height = textCells[i].offsetHeight;
            nrCells[i].style.height = height + "px";
        }
    }

    public getPosition(container: HTMLElement, offset: number): TextPosition {
        const line = container.nodeName === "DIV" ? container : container.parentNode as HTMLElement;
        const lines = Array.from(this.textBody.childNodes) as HTMLElement[];
        const lineIndex = lines.indexOf(line);

        return {
            line: lineIndex,
            offset: offset,
        };
    }

    public getLine(lineNr: number): HTMLElement {
        const lines = Array.from(this.textBody.childNodes) as HTMLElement[];
        return lines[lineNr];
    }

    public getLineText(line: HTMLElement): string {
        return line.textContent;
    }

    public setLineText(line: HTMLElement, text: string): void {
        line.textContent = text;
        if (text === "") {
            line.appendChild(document.createElement("br"));
        }
    }

    public movePosition(position: TextPosition, delta: number): TextPosition {
        let absDelta = Math.abs(delta);
        const signDelta = delta >= 0 ? 1 : -1;

        let lineNr = position.line;
        let offset = position.offset;
        let line = this.getLine(lineNr);
        let lineLength = this.getLineText(line).length;

        while (true) {
            const remaining = signDelta > 0 ? lineLength - offset : offset;
            const step = Math.min(remaining, absDelta);
            offset += signDelta * step;
            absDelta -= step;
            if (absDelta === 0) {
                break;
            }

            line = (signDelta > 0 ? line.nextSibling : line.previousSibling) as HTMLElement;
            if (line === null) {
                break;
            }
            lineLength = this.getLineText(line).length;
            lineNr += signDelta;
            offset = signDelta > 0 ? 0 : lineLength;
            absDelta -= 1;
        }

        return { line: lineNr, offset: offset };
    }

    public getText(from: TextPosition, to: TextPosition): string {
        let result = "";

        for (let lineNr = from.line; lineNr <= to.line; ++lineNr) {
            if (lineNr > from.line) {
                result += "\n";
            }

            const line = this.getLine(lineNr);
            const lineText = this.getLineText(line);

            if (from.line === to.line) {
                result += lineText.slice(from.offset, to.offset);
            } else if (lineNr === from.line) {
                result += lineText.slice(from.offset);
            } else if (lineNr === to.line) {
                result += lineText.slice(0, to.offset);
            } else {
                result += lineText;
            }
        }

        return result;
    }

    public insertText(position: TextPosition, text: string): TextPosition {
        const textLines = text.split("\n");

        let line = this.getLine(position.line);
        const originalText = this.getLineText(line);

        if (textLines.length === 1) {
            const newText =
                originalText.slice(0, position.offset) +
                textLines[0] +
                originalText.slice(position.offset);
            this.setLineText(line, newText);
            return { line: position.line, offset: position.offset + textLines[0].length };
        }

        for (let i = 0; i < textLines.length; ++i) {
            if (i > 0) {
                this.textBody.insertBefore(
                    document.createElement("div"),
                    line.nextSibling
                );
                line = line.nextSibling as HTMLElement;

                this.textNr.appendChild(document.createElement("div"));
                this.textNr.lastChild.textContent = `${Array.from(this.textBody.childNodes).length + 1}`;
            }

            if (i === 0) {
                const newText =
                    originalText.slice(0, position.offset) +
                    textLines[i];
                this.setLineText(line, newText);
            } else if (i === textLines.length - 1) {
                const newText =
                    textLines[i] +
                    originalText.slice(position.offset);
                this.setLineText(line, newText);
            } else {
                this.setLineText(line, textLines[i]);
            }
        }

        return {
            line: position.line + textLines.length - 1,
            offset: textLines[textLines.length - 1].length,
        };
    }

    public removeText(from: TextPosition, to: TextPosition): void {
        const firstLine = this.getLine(from.line);
        const lastLine = this.getLine(to.line);

        const newText =
            this.getLineText(firstLine).slice(0, from.offset) +
            this.getLineText(lastLine).slice(to.offset);
        this.setLineText(firstLine, newText);

        for (let lineNr = from.line + 1; lineNr <= to.line; ++lineNr) {
            this.textBody.removeChild(firstLine.nextSibling);
            this.textNr.removeChild(this.textNr.lastChild);
        }
    }

    public placeCursorAt(start: TextPosition): void {
        const line = this.getLine(start.line);
        const text = line.firstChild;

        const range = document.createRange();
        const selection = window.getSelection();

        range.setStart(text, start.offset);
        range.setEnd(text, start.offset);
        range.collapse(true);

        selection.removeAllRanges();
        selection.addRange(range);
    }

    public doChange(change: Change): void {
        if (change.type === "insertText") {
            this.insertText(change.position, change.text);
            return;
        }

        if (change.type === "removeText") {
            const toPosition = this.movePosition(change.position, change.text.length);
            this.removeText(change.position, toPosition);
            return;
        }
    }

    public invertChange(change: Change): Change {
        if (change.type === "insertText") {
            return {
                type: "removeText",
                text: change.text,
                position: change.position,
            };
        }

        if (change.type === "removeText") {
            return {
                type: "insertText",
                text: change.text,
                position: change.position,
            };
        }
    }

    public undoChange(change: Change): void {
        this.doChange(this.invertChange(change));
    }

    public undo(): void {
        if (!this.history.canUndo()) {
            return;
        }
        const lastChange = this.history.undo();
        this.undoChange(lastChange);
    }

    public redo(): void {
        if (!this.history.canRedo()) {
            return;
        }
        const nextChange = this.history.redo();
        this.doChange(nextChange);
    }

    public insertTextAction(text: string): void {
        const selection = window.getSelection();
        if (selection.rangeCount !== 1) {
            console.log("Multiple selection ranges, not supported");
            return;
        }
        const range = selection.getRangeAt(0);
        const position = this.getPosition(range.startContainer as HTMLElement, range.startOffset);

        if (range.startContainer !== range.endContainer ||
            range.startOffset !== range.endOffset) {
            this.removeTextAction("backward");
        }
        const newPosition = this.insertText(position, text);
        this.history.push({
            type: "insertText",
            text: text,
            position: position,
        });

        this.placeCursorAt(newPosition);
    }

    public removeTextAction(mode: RemoveMode): void {
        const selection = window.getSelection();
        if (selection.rangeCount !== 1) {
            console.log("Multiple selection ranges, not supported");
            return;
        }
        const range = selection.getRangeAt(0);
        const startPosition = this.getPosition(range.startContainer as HTMLElement, range.startOffset);
        const endPosition = this.getPosition(range.endContainer as HTMLElement, range.endOffset);
        const isSelected =
            range.startContainer !== range.endContainer ||
            range.startOffset !== range.endOffset;

        const fromPosition = isSelected ? startPosition : (mode === "forward" ? startPosition : this.movePosition(startPosition, -1));
        const toPosition = isSelected ? endPosition : (mode === "forward" ? this.movePosition(endPosition, 1) : endPosition);

        if (fromPosition.line === toPosition.line &&
            fromPosition.offset === toPosition.offset) {
            console.log("No text to remove");
            return;
        }

        const removedText = this.getText(fromPosition, toPosition);
        this.removeText(fromPosition, toPosition);
        this.history.push({
            type: "removeText",
            text: removedText,
            position: fromPosition,
        });

        this.placeCursorAt(fromPosition);
    }
}

const textNr = document.querySelector<HTMLElement>(".odr-text-nr");
const textBody = document.querySelector<HTMLElement>(".odr-text-body");
const textEditor = new TextEditor(textNr, textBody);
