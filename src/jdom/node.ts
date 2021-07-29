import { JDEventSource } from "./eventsource"

/**
 * Base class for JDOM Node classes.
 * @category JDOM
 */
export abstract class JDNode extends JDEventSource {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emitPropagated(event: string, arg?: any) {
        let current = this as JDNode
        while (current) {
            current.emit(event, arg)
            current = current.parent
        }
    }

    toString() {
        return this.friendlyName
    }
}

export function visitNodes(node: JDNode, vis: (node: JDNode) => void) {
    const todo = [node]
    while (todo.length) {
        const node = todo.pop()
        vis(node)
        node.children.forEach(child => todo.push(child))
    }
}
