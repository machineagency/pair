// TODO: I am not sure what goes here yet, but I'm keeping this as a stub in
// the meantime. I will need to work out some more examples first before
// I know.

class Program {
    rootASTNode: ASTNode;

    constructor() {
        this.rootASTNode = new ASTNode(NodeType.ROOT);
    }

    generateCode() : string {
        return '';
    }
}

class ASTNode {
    nodeType: NodeType

    constructor(nodeType: NodeType) {
        this.nodeType = nodeType;
    }
}

enum NodeType {
    ROOT, ASSIGN
};

