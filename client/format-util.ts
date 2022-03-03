// From: https://zserge.com/posts/js-editor/
export class FormatUtil {

    static highlight(programLinesDom: HTMLElement) {
        for (const node of programLinesDom.children) {
            const s = (node as HTMLElement).innerText
                .replace(/(\/\/.*)/g, '<em>$1</em>')
                .replace(
                  /\b(new|if|else|do|while|switch|for|in|of|continue|break|return|typeof|function|var|const|let|\.length|\.\w+)(?=[^\w])/g,
                  '<strong>$1</strong>',
                )
                .replace(/(".*?"|'.*?'|`.*?`)/g, '<em>$1</em>')
                .replace(/\b(\d+)/g, '<em><strong>$1</strong></em>');
            node.innerHTML = s.split('\n').join('<br/>');
        }
    }

    static caret(lineDom: HTMLElement) : number {
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
        prefix.selectNodeContents(lineDom);
        prefix.setEnd(range.endContainer, range.endOffset);
        return prefix.toString().length;
    }

    static setCaret(pos: number, parent: HTMLElement) {
        for (const node of parent.childNodes) {
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
}

