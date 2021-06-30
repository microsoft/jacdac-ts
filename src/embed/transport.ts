import { JDBus } from "../jdom/bus"
import JDIFrameClient from "../jdom/iframeclient"
import { SMap } from "../jdom/utils"
import { IAckMessage, IMessage, IStatusMessage } from "./protocol"

export interface ITransport {
    postMessage<TMessage extends IMessage, TResponse extends IMessage>(
        msg: TMessage
    ): Promise<TResponse>
    onMessage<TMessage extends IMessage>(
        type: string,
        handler: (msg: TMessage) => void
    ): void
}

export class IFrameTransport extends JDIFrameClient implements ITransport {
    private readonly ackAwaiters: SMap<(msg: any) => void> = {}

    constructor(bus: JDBus) {
        super(bus)
        this.handleMessage = this.handleMessage.bind(this)

        window.addEventListener("message", this.handleMessage, false)
        this.mount(() =>
            window.removeEventListener("message", this.handleMessage, false)
        )
    }

    postReady() {
        this.postMessage({
            type: "status",
            data: {
                status: "ready",
            },
        } as IStatusMessage)
    }

    /**
     * Post message to client and awaits for ack if needed
     * @param msg
     */
    postMessage<TMessage extends IMessage, IAckMessage>(
        msg: TMessage
    ): Promise<IAckMessage> {
        let p: Promise<IAckMessage>

        msg.id = "jd:" + Math.random()
        msg.source = "jacdac"

        if (msg.requireAck) {
            p = new Promise<IAckMessage>(resolve => {
                this.ackAwaiters[msg.id] = msg => {
                    resolve(msg)
                }
            })
        }

        window.parent.postMessage(msg, this.origin)
        return p || Promise.resolve(undefined)
    }

    onMessage<TMessage extends IMessage>(
        type: string,
        handler: (msg: TMessage) => void
    ): void {
        this.on(`message:${type}`, handler)
    }

    private handleMessage(event: MessageEvent) {
        if (!this.isOriginValid(event)) return

        const msg = event.data as IMessage
        if (!msg || msg.source !== "jacdac") return

        // handle acks separately
        if (msg.type === "ack") {
            const ack = msg as IAckMessage
            const awaiter = this.ackAwaiters[ack.ackId]
            delete this.ackAwaiters[ack.ackId]
            if (awaiter) awaiter(msg)
        } else {
            this.emit(`message:${msg.type}`, msg)
        }
    }
}
