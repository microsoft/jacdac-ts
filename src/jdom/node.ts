/* eslint-disable @typescript-eslint/no-explicit-any */
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
     * @category JDOM
     */
    abstract get id(): string

    /**
     * Gets a kind identifier useful for UI descriptions
     * @category JDOM
     */
    abstract get nodeKind(): string

    /**
     * Gets the local name
     * @category JDOM
     */
    abstract get name(): string

    /**
     * A human friendly name
     * @category JDOM
     */
    get friendlyName(): string {
        return this.name
    }

    /**
     * Gets the name including parents
     * @category JDOM
     */
    abstract get qualifiedName(): string

    /**
     * Gets the parent node in the Jacdac dom
     * @category JDOM
     */
    abstract get parent(): JDNode

    /**
     * Gets the children of the current node
     * @category JDOM
     */
    abstract get children(): JDNode[]

    /**
     * Emit event in current node and parent nodes
     * @param event event to emit
     * @param arg event arguments
     * @category JDOM
     */
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

export default JDNode

export function visitNodes(node: JDNode, vis: (node: JDNode) => void) {
    const todo = [node]
    while (todo.length) {
        const node = todo.pop()
        vis(node)
        node.children.forEach(child => todo.push(child))
    }
}
