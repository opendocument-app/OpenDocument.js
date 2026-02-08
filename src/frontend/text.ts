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

    push(change: Change) {
        this.past.push(change);
        this.future = [];
    }

    canUndo() {
        return this.past.length > 0;
    }

    canRedo() {
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

function updateLineNumberHeight() {
    const nrCells = document.querySelectorAll<HTMLElement>(".odr-text-nr > div");
    const textCells = document.querySelectorAll<HTMLElement>(".odr-text-body > div");

    for (let i = 0; i < textCells.length; i++) {

        const height = textCells[i].offsetHeight;
        nrCells[i].style.height = height + "px";
    }
}

const textNr = document.querySelector<HTMLElement>(".odr-text-nr");
const textBody = document.querySelector<HTMLElement>(".odr-text-body");
const changeHistory = new History();

const resizeObserver = new ResizeObserver(entries => {
    updateLineNumberHeight();
});
resizeObserver.observe(textBody);

textBody.addEventListener("input", (event) => {
    const nrCells = document.querySelectorAll<HTMLElement>(".odr-text-nr > div");
    const textCells = document.querySelectorAll<HTMLElement>(".odr-text-body > div");

    const nrCount = nrCells.length;
    const lineCount = textCells.length;
    if (lineCount > nrCount) {
        for (let i = nrCount + 1; i <= lineCount; i++) {
            const nrCell = document.createElement("div");
            nrCell.textContent = `${i}`;
            textNr.appendChild(nrCell);
        }
    } else if (lineCount < nrCount) {
        for (let i = nrCount; i > lineCount; --i) {
            textNr.removeChild(
                textNr.lastChild);
        }
    }

    updateLineNumberHeight();
});

function getPosition(container: HTMLElement, offset: number) {
    const line = container.nodeName === "DIV" ? container : container.parentNode as HTMLElement;
    const lines = Array.from(textBody.childNodes) as HTMLElement[];
    const lineIndex = lines.indexOf(line);

    return {
        line: lineIndex,
        offset: offset,
    };
}

function getLine(lineNr: number): HTMLElement {
    const lines = Array.from(textBody.childNodes) as HTMLElement[];
    return lines[lineNr];
}

function getLineText(line: HTMLElement) {
    return line.textContent;
}

function setLineText(line: HTMLElement, text: string) {
    line.textContent = text;
    if (text === "") {
        line.appendChild(document.createElement("br"));
    }
}

function movePosition(position: TextPosition, delta: number) {
    let absDelta = Math.abs(delta);
    const signDelta = delta >= 0 ? 1 : -1;

    let lineNr = position.line;
    let offset = position.offset;
    let line = getLine(lineNr);
    let lineLength = getLineText(line).length;

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
        lineLength = getLineText(line).length;
        lineNr += signDelta;
        offset = signDelta > 0 ? 0 : lineLength;
        absDelta -= 1;
    }

    return { line: lineNr, offset: offset };
}

function getText(from: TextPosition, to: TextPosition) {
    let result = "";

    for (let lineNr = from.line; lineNr <= to.line; ++lineNr) {
        if (lineNr > from.line) {
            result += "\n";
        }

        const line = getLine(lineNr);
        const lineText = getLineText(line);

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

function insertText(position: TextPosition, text: string) {
    const textLines = text.split("\n");

    let line = getLine(position.line);
    const originalText = getLineText(line);

    if (textLines.length === 1) {
        const newText =
            originalText.slice(0, position.offset) +
            textLines[0] +
            originalText.slice(position.offset);
        setLineText(line, newText);
        return { line: position.line, offset: position.offset + textLines[0].length };
    }

    for (let i = 0; i < textLines.length; ++i) {
        if (i > 0) {
            textBody.insertBefore(
                document.createElement("div"),
                line.nextSibling
            );
            line = line.nextSibling as HTMLElement;

            textNr.appendChild(document.createElement("div"));
            textNr.lastChild.textContent = `${Array.from(textBody.childNodes).length + 1}`;
        }

        if (i === 0) {
            const newText =
                originalText.slice(0, position.offset) +
                textLines[i];
            setLineText(line, newText);
        } else if (i === textLines.length - 1) {
            const newText =
                textLines[i] +
                originalText.slice(position.offset);
            setLineText(line, newText);
        } else {
            setLineText(line, textLines[i]);
        }
    }

    return {
        line: position.line + textLines.length - 1,
        offset: textLines[textLines.length - 1].length,
    };
}

function removeText(from: TextPosition, to: TextPosition) {
    const firstLine = getLine(from.line);
    const lastLine = getLine(to.line);

    const newText =
        getLineText(firstLine).slice(0, from.offset) +
        getLineText(lastLine).slice(to.offset);
    setLineText(firstLine, newText);

    for (let lineNr = from.line + 1; lineNr <= to.line; ++lineNr) {
        textBody.removeChild(firstLine.nextSibling);

        textNr.removeChild(textNr.lastChild);
    }
}

function placeCursorAt(start: TextPosition) {
    const line = getLine(start.line);
    const text = line.firstChild;

    const range = document.createRange();
    const selection = window.getSelection();

    range.setStart(text, start.offset);
    range.setEnd(text, start.offset);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);
}

function doChange(change: Change) {
    if (change.type === "insertText") {
        insertText(change.position, change.text);
        return;
    }

    if (change.type === "removeText") {
        const toPosition = movePosition(change.position, change.text.length);
        removeText(change.position, toPosition);
        return;
    }
}

function invertChange(change: Change): Change {
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

function undoChange(change: Change) {
    doChange(invertChange(change));
}

function undo() {
    if (!changeHistory.canUndo()) {
        return;
    }
    const lastChange = changeHistory.undo();
    undoChange(lastChange);
}

function redo() {
    if (!changeHistory.canRedo()) {
        return;
    }
    const nextChange = changeHistory.redo();
    doChange(nextChange);
}

function insertTextAction(text: string) {
    const selection = window.getSelection();
    if (selection.rangeCount !== 1) {
        console.log("Multiple selection ranges, not supported");
        return;
    }
    const range = selection.getRangeAt(0);
    const position = getPosition(range.startContainer as HTMLElement, range.startOffset);

    if (range.startContainer !== range.endContainer ||
        range.startOffset !== range.endOffset) {
        removeTextAction("backward");
    }
    const newPosition = insertText(position, text);
    changeHistory.push({
        type: "insertText",
        text: text,
        position: position,
    });

    placeCursorAt(newPosition);
}

function removeTextAction(mode: RemoveMode) {
    const selection = window.getSelection();
    if (selection.rangeCount !== 1) {
        console.log("Multiple selection ranges, not supported");
        return;
    }
    const range = selection.getRangeAt(0);
    const startPosition = getPosition(range.startContainer as HTMLElement, range.startOffset);
    const endPosition = getPosition(range.endContainer as HTMLElement, range.endOffset);
    const isSelected =
        range.startContainer !== range.endContainer ||
        range.startOffset !== range.endOffset;

    const fromPosition = isSelected ? startPosition : (mode === "forward" ? startPosition : movePosition(startPosition, -1));
    const toPosition = isSelected ? endPosition : (mode === "forward" ? movePosition(endPosition, 1) : endPosition);

    if (fromPosition.line === toPosition.line &&
        fromPosition.offset === toPosition.offset) {
        console.log("No text to remove");
        return;
    }

    const removedText = getText(fromPosition, toPosition);
    removeText(fromPosition, toPosition);
    changeHistory.push({
        type: "removeText",
        text: removedText,
        position: fromPosition,
    });

    placeCursorAt(fromPosition);
}

textBody.addEventListener("beforeinput", (e) => {
    e.preventDefault();

    if (e.inputType === "historyUndo") {
        undo();
        return;
    }
    if (e.inputType === "historyRedo") {
        redo();
        return;
    }

    if (e.inputType === "insertText") {
        insertTextAction(e.data);
        return;
    }
    if (e.inputType === "insertParagraph") {
        insertTextAction("\n");
        return;
    }

    if (e.inputType === "deleteContentBackward") {
        removeTextAction("backward");
        return;
    }
    if (e.inputType === "deleteContentForward") {
        removeTextAction("forward");
        return;
    }
});

textBody.addEventListener("paste", (e) => {
    e.preventDefault();

    const plain = e.clipboardData.getData("text/plain");
    insertTextAction(plain);
});

textBody.addEventListener("drop", e => e.preventDefault());
textBody.addEventListener("dragover", e => e.preventDefault());
