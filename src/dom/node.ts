import { JDEventSource } from "./eventsource";

let nextNodeId = 0
export abstract class JDNode extends JDEventSource {
    public readonly nodeId = nextNodeId++ // debugging

    constructor() {
        super()
    }

    /**
     * Globally unique identifier per GraphQL spec
     */
    abstract get id(): string;

    /**
     * Gets a kind identifier useful for UI descriptions
     */
    abstract get nodeKind(): string;

    /**
     * Gets the local name
     */
    abstract get name(): string;

    /**
     * Gets the name including parents
     */
    abstract get qualifiedName(): string;
}
