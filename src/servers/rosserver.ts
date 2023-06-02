import { JSONTryParse, jdpack } from "../jacdac"
import { CHANGE, RosCmd, RosCmdPack, SRV_ROS } from "../jdom/constants"
import { Packet } from "../jdom/packet"
import { JDServiceServer } from "../jdom/servers/serviceserver"

export const ADVERTISE = "advertise"
export const SUBSCRIBE = "subscribe"
export const PUBLISH = "publish"
export const RosReportMessage = 0x83

/**
 * Emitted with SUBSCRIBE on new subscription
 */
export interface RosSubscription {
    node: string
    topic: string
}

/**
 * Emitted with PUBLISH when receiving a publish message command
 */
export interface RosMessage {
    node: string
    topic: string
    message: any
    messageSource: string
}

/**
 * A thin ROS server implementation.
 * 
 * Maintains a list of subscription for message and raises event on publishing and subscriptions.
 */
export class RosServer extends JDServiceServer {
    // topic -> nodes
    private _subscriptions: Record<string, Set<string>> = {}

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
            this._subscriptions[topic] ||
            (this._subscriptions[topic] = new Set<string>())
        if (!sub.has(node)) {
            sub.add(node)
            this.emit(SUBSCRIBE, { node, topic })
            this.emit(CHANGE)    
        }
    }

    /**
     * Clears all subscriptions
     */
    clear() {
        this._subscriptions = {}
        this.emit(CHANGE)
    }

    /**
     * Gets the list of subscription handled by this node
     */
    subscriptions() {
        return Object.keys(this.subscriptions)
    }

    /**
     * Publishes a message on the bus if any subscription is active.
     * @param node source node for the message
     * @param topic topic of the message
     * @param message JSON data payload; that will be converted to string
     */
    public async publishMessage(node: string, topic: string, message: any) {
        if (!this._subscriptions[topic]?.size)
            return;

        const data = jdpack<[string, string, any]>(RosCmdPack.PublishMessage, [node, topic, JSON.stringify(message)])
        await this.sendPacketAsync(Packet.from(RosReportMessage, data))
    }

    private async handlePublishMessage(pkt: Packet) {
        const [node, topic, messageSource] = pkt.jdunpack<
            [string, string, string]
        >(RosCmdPack.PublishMessage)
        const message = JSONTryParse(messageSource)

        this.emit(PUBLISH, <RosMessage>{ node, topic, message, messageSource })
    }
}
