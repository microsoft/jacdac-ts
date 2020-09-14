import { JDDOMServices } from "./domservices";
import { JDEventSource } from "./eventsource";

let nextNodeId = 0
export abstract class JDNode extends JDEventSource {
    public readonly nodeId = nextNodeId++ // debugging
    private _domServices?: JDDOMServices;

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

    /**
     * Gets the parent node in the JACDAC dom
     */
    abstract get parent(): JDNode;

    /**
     * Gets the options from the tree
     */
    protected get domServices() {
        return this._domServices || this.parent?.domServices;
    }

    protected set domServices(value: JDDOMServices) {
        this._domServices = value;
    }

    protected log(msg: any) {
        this.domServices?.logger?.log('log', `${this}: ${msg}`)
    }
}
