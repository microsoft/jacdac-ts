import { JDBus } from "./bus";
import { JDClient } from "./client";

export default class JDIFrameClient extends JDClient {
    constructor(readonly bus: JDBus) {
        super()
    }

    get origin() {
        return this.bus.options?.parentOrigin || "*";
    }
}