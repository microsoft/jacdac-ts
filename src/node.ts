import { EventEmitter } from "./eventemitter";

export abstract class Node extends EventEmitter {
    constructor() {
        super()
    }
    /**
     * Globally unique identifier per GraphQL spec
     */
    abstract get id(): string;
}