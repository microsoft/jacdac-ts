import { JDEventSource } from "./eventsource"

let nextNodeId = 0
export abstract class JDNode extends JDEventSource {
    public readonly nodeId = nextNodeId++ // debugging

    constructor() {
        super()
    }

    /**
     * Globally unique identifier in the tree
     */
    abstract get id(): string

    /**
     * Gets a kind identifier useful for UI descriptions
     */
    abstract get nodeKind(): string

    /**
     * Gets the local name
     */
    abstract get name(): string

    /**
     * A human friendly name
     */
    abstract get friendlyName(): string

    /**
     * Gets the name including parents
     */
    abstract get qualifiedName(): string

    /**
     * Gets the parent node in the Jacdac dom
     */
    abstract get parent(): JDNode

    /**
     * Gets the children of the current node
     */
    abstract get children(): JDNode[]

    toString() {
        return this.friendlyName
    }
}

export function dependencyId(nodes: JDNode[]) {
    return nodes?.map(node => node?.id || "?").join(",") || ""
}

export function visitNodes(node: JDNode, vis: (node: JDNode) => void) {
    const todo = [node]
    while (todo.length) {
        const node = todo.pop()
        vis(node)
        node.children.forEach(child => todo.push(child))
    }
}
