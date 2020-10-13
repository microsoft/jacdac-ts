import { JDBus } from "../dom/bus";
import JDIFrameClient from "../dom/iframeclient";
import { IMessage, IStatusMessage } from "./protocol";

export interface ITransport {
    postMessage(msg: IMessage): Promise<void>;
}

export class IFrameTransport extends JDIFrameClient
    implements ITransport {
    constructor(bus: JDBus) {
        super(bus)
    }

    postReady() {
        this.postMessage({
            type: 'status',
            data: {
                status: 'ready'
            }
        } as IStatusMessage)
    }

    postMessage(msg: IMessage): Promise<void> {
        msg.id = "jd:" + Math.random()
        msg.source = "jacdac"
        window.parent.postMessage(msg, this.origin)
        return Promise.resolve();
    }
}
