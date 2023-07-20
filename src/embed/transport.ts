import { JDClient } from "../jdom/client"
import { EmbedAckMessage, EmbedMessage, EmbedStatusMessage } from "./protocol"

export interface EmbedTransport {
    postMessage<TMessage extends EmbedMessage, TResponse extends EmbedMessage>(
        msg: TMessage,
    ): Promise<TResponse>
    onMessage<TMessage extends EmbedMessage>(
        type: string,
        handler: (msg: TMessage) => void,
    ): void
}

/**
 * @internal
 */
export class IFrameTransport extends JDClient implements EmbedTransport {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly ackAwaiters: Record<string, (msg: any) => void> = {}

    constructor(readonly origin: string) {
        super()
        this.handleMessage = this.handleMessage.bind(this)

        window.addEventListener("message", this.handleMessage, false)
        this.mount(() =>
            window.removeEventListener("message", this.handleMessage, false),
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
        } as EmbedStatusMessage)
    }

    /**
     * Post message to client and awaits for ack if needed
     * @internal
     */
    postMessage<TMessage extends EmbedMessage, AckMessage>(
        msg: TMessage,
    ): Promise<AckMessage> {
        let p: Promise<AckMessage>

        msg.id = "jd:" + Math.random()
        msg.source = "jacdac"

        if (msg.requireAck) {
            p = new Promise<AckMessage>(resolve => {
                this.ackAwaiters[msg.id] = msg => {
                    resolve(msg)
                }
            })
        }

        window.parent.postMessage(msg, this.origin)
        return p || Promise.resolve(undefined)
    }

    onMessage<TMessage extends EmbedMessage>(
        type: string,
        handler: (msg: TMessage) => void,
    ): void {
        this.on(`message:${type}`, handler)
    }

    private handleMessage(event: MessageEvent) {
        if (!this.isOriginValid(event)) return

        const msg = event.data as EmbedMessage
        if (!msg || msg.source !== "jacdac") return

        // handle acks separately
        if (msg.type === "ack") {
            const ack = msg as EmbedAckMessage
            const awaiter = this.ackAwaiters[ack.ackId]
            delete this.ackAwaiters[ack.ackId]
            if (awaiter) awaiter(msg)
        } else {
            this.emit(`message:${msg.type}`, msg)
        }
    }
}
