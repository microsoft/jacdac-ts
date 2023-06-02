import { JSONTryParse, jdpack } from "../jacdac"
import { CHANGE, RosCmd, RosCmdPack, SRV_ROS } from "../jdom/constants"
import { Packet } from "../jdom/packet"
import { JDServiceServer } from "../jdom/servers/serviceserver"

export const ADVERTISE = "advertise"
export const SUBSCRIBE = "subscribe"
export const PUBLISH = "publish"

export interface RosSubscription {
    node: string
    topic: string
}

export interface RosMessage {
    node: string
    topic: string
    message: any
    messageSource: string
}

export class RosServer extends JDServiceServer {
    // topic -> nodes
    public readonly subscriptions: Record<string, Set<string>> = {}

    constructor() {
        super(SRV_ROS)

        this.addCommand(
            RosCmd.SubscribeMessage,
            this.handleSubscribeMessage.bind(this)
        )
        this.addCommand(
            RosCmd.PublishMessage,
            this.handlePublishMessage.bind(this)
        )
    }

    private handleSubscribeMessage(pkt: Packet) {
        const [node, topic] = pkt.jdunpack<[string, string]>(
            RosCmdPack.SubscribeMessage
        )

        const sub =
            this.subscriptions[topic] ||
            (this.subscriptions[topic] = new Set<string>())
        sub.add(node)
        this.emit(SUBSCRIBE, { node, topic })
        this.emit(CHANGE)
    }

    private async handlePublishMessage(pkt: Packet) {
        const [node, topic, messageSource] = pkt.jdunpack<
            [string, string, string]
        >(RosCmdPack.PublishMessage)
        const message = JSONTryParse(messageSource)

        this.emit(PUBLISH, <RosMessage>{ node, topic, message, messageSource })

        // publish report
        const data = jdpack("z s", [topic, messageSource])
        const msgPkt = Packet.from(0x83, data)
        await this.sendPacketAsync(msgPkt)
    }
}
