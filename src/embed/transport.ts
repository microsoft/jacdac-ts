import { JDClient } from "../jdom/client"
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

/**
 * @internal
 */
export class IFrameTransport extends JDClient implements ITransport {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly ackAwaiters: Record<string, (msg: any) => void> = {}

    constructor(readonly origin: string) {
        super()
        this.handleMessage = this.handleMessage.bind(this)

        window.addEventListener("message", this.handleMessage, false)
        this.mount(() =>
            window.removeEventListener("message", this.handleMessage, false)
        )
    }

    private isOriginValid(msg: MessageEvent) {
        return this.origin === "*" || msg.origin === this.origin
    }

    /**
     * @internal
     */
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
     * @internal
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
