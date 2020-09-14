import { IMessage, IStatusMessage } from "./protocol";

export interface ITransport {
    postMessage(msg: IMessage): Promise<void>;
}

export class HTMLIFrameTransport implements ITransport {
    constructor(public targetOrigin: string = "*") {
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
        window.parent.postMessage(msg, this.targetOrigin)
        return Promise.resolve();
    }
}
