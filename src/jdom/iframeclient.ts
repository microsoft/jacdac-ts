import { JDBus } from "./bus";
import { JDClient } from "./client";

export default class JDIFrameClient extends JDClient {
    constructor(readonly bus: JDBus) {
        super()
    }

    get origin() {
        return this.bus.options?.parentOrigin || "*";
    }

    protected isOriginValid(msg: MessageEvent) {
        return this.origin === "*" || msg.origin === this.origin;
    }
}

export function inIFrame() {
    try {
        return typeof window !== "undefined"
            && window.self !== window.top
    } catch (e) {
        return typeof window !== "undefined";
    }
}
