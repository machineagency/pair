// From: https://zserge.com/posts/js-editor/
export class FormatUtil {

    static isCharKeypress(e: React.KeyboardEvent<HTMLDivElement>) {
        // Alphanumeric || space || backspace
        return e.keyCode >= 0x30 || e.keyCode == 0x20 || e.keyCode == 0x08
            || e.keyCode == 0x09;
    }

    static highlight(programLinesDom: HTMLElement) {
        for (const node of programLinesDom.children) {
            // Check if this line is solely a comment and if so process
            // accordingly without making any other changes;
            let s;
            let commentRegex = /(\/\/.*)$/gm;
            if ((node as HTMLElement).innerText.search(commentRegex) !== -1) {
                s = (node as HTMLElement).innerText
                    .replace(/(\/\/.*)$/gm, '<div class="comment">$1</div>');
            }
            else {
                s = (node as HTMLElement).innerText
                    // NOTE: we can only add class="..." after we replace quotes.
                    .replace(/(".*?"|'.*?'|`.*?`)/g, '<em>$1</em>')
                    .replace(
                      /\b(await|async|new|if|else|do|while|switch|for|in|of|continue|break|return|typeof|function|var|const|let|\.length|\.\w+)(?=[^\w])/g,
                      '<strong>$1</strong>',
                    )
                    .replace(/\b(\d+)/g, '<em><strong>$1</strong></em>')
                    .replace(/(\$\w+)/g, '<div class="red">$1</div>');
            }
            node.innerHTML = s.split('\n').join('<br/>');
        }
    }

    static caret(programLinesDom: HTMLElement) : number {
        const sel = window.getSelection();
        if (!sel) { return 0; }
        let range;
        try {
            range = sel.getRangeAt(0);
        }
        catch (e) {
            return 0;
        }
        const prefix = range.cloneRange();
        prefix.selectNodeContents(programLinesDom);
        prefix.setEnd(range.endContainer, range.endOffset);
        return prefix.toString().length;
    }

    static setCaret(pos: number, programLinesDom: HTMLElement) {
        for (const node of programLinesDom.childNodes) {
            if (node.nodeType == Node.TEXT_NODE) {
                let currNode = node as Text;
                if (currNode.length >= pos) {
                    const range = document.createRange();
                    const sel = window.getSelection();
                    if (!sel) { return -1; }
                    range.setStart(node, pos);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    return -1;
                } else {
                    pos = pos - currNode.length;
                }
            } else {
                let currNode = node as HTMLElement;
                pos = FormatUtil.setCaret(pos, currNode);
                if (pos < 0) {
                  return pos;
                }
            }
        }
        return pos;
    };

    static isTabKeypress(e: KeyboardEvent) {
        return e.which == 9;
    }

    static handleTabKeypress(e: KeyboardEvent, programLinesDom: HTMLElement) {
        const tabDepth = 4;
        const magicalSpace = '\xa0';
        const tab = magicalSpace.repeat(tabDepth);
        const pos = FormatUtil.caret(programLinesDom) + tab.length;
        const sel = window.getSelection();
        if (!sel) { return; }
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(tab));
        FormatUtil.highlight(programLinesDom);
        FormatUtil.setCaret(pos, programLinesDom);
        e.preventDefault();
    }
}

