import {
    AzureIotHubHealthConnectionStatus,
    AzureIoTHubHealthServer,
    CHANGE,
    CONNECT,
    DISCONNECT,
    fromBase64,
    fromUTF8,
    JDEventSource,
    sha256Hmac,
    stringToUint8Array,
    toBase64,
} from "jacdac-ts"
import MQTT from "paho-mqtt"

async function generateSasToken(
    resourceUri: string,
    signingKey: string,
    expiresEpoch: number
) {
    const key = fromBase64(signingKey)
    resourceUri = encodeURIComponent(resourceUri)
    const toSign = resourceUri + "\n" + expiresEpoch
    const sigBytes = await sha256Hmac(key, stringToUint8Array(fromUTF8(toSign)))
    const sig = encodeURIComponent(toBase64(sigBytes))
    const token = `sr=${resourceUri}&se=${expiresEpoch}&sig=${sig}`
    return token
}

const methodPrefix = "$iothub/methods/POST/"

function parseTopicArgs(topic: string) {
    const qidx = topic.indexOf("?")
    if (qidx >= 0) return parsePropertyBag(topic.slice(qidx + 1))
    return {}
}

function splitPair(kv: string): string[] {
    const i = kv.indexOf("=")
    if (i < 0) return [kv, ""]
    else return [kv.slice(0, i), kv.slice(i + 1)]
}

function parsePropertyBag(
    msg: string,
    separator?: string
): Record<string, string> {
    const r: Record<string, string> = {}
    if (msg && typeof msg === "string")
        msg.split(separator || "&")
            .map(kv => splitPair(kv))
            .filter(parts => !!parts[1].length)
            .forEach(
                parts =>
                    (r[decodeURIComponent(parts[0])] = decodeURIComponent(
                        parts[1]
                    ))
            )
    return r
}

export interface MethodInvocation {
    method: string
    seqNo: number
    payload: any
}

export class AzureIoTHubConnector extends JDEventSource {
    client: MQTT.Client
    clientId: string
    disabled = false
    toSend: MQTT.Message[] = []

    constructor(private healthServer: AzureIoTHubHealthServer) {
        super()
        this.healthServer.isReal = true
        this.healthServer.on(CONNECT, () => this.connect())
        this.healthServer.on(DISCONNECT, () => this.disconnect())
        this.healthServer.on(CHANGE, () => {
            this.disconnect()
            this.connect()
        })

        setInterval(() => {
            if (!this.disabled && !this.client) this.connect()
        }, 1000)
    }

    public upload(label: string, values: number[]) {
        this.publish(
            `devices/${this.clientId}/messages/events/`,
            JSON.stringify({
                device: this.healthServer.device.deviceId,
                label,
                values,
            })
        )
    }

    private emitDisconnect() {
        this.emit(DISCONNECT)
        this.healthServer.setConnectionStatus(
            AzureIotHubHealthConnectionStatus.Disconnected
        )
    }

    private disconnect() {
        this.disabled = true
        const c = this.client
        this.client = null
        if (c) {
            try {
                c.disconnect()
            } catch {}
            this.emitDisconnect()
        }
    }

    private log(msg: string) {
        console.log(`AzureIoT: ${msg}`)
    }

    private handleMqttMsg(msg: MQTT.Message) {
        this.log(
            "onMessageArrived: " +
                msg.destinationName +
                " -> " +
                msg.payloadString
        )

        if (msg.destinationName.startsWith(methodPrefix)) {
            const props = parseTopicArgs(msg.destinationName)
            const qidx = msg.destinationName.indexOf("/?")
            const methodName = msg.destinationName.slice(
                methodPrefix.length,
                qidx
            )
            this.log("method: '" + methodName + "'; " + JSON.stringify(props))
            const rid = parseInt(props["$rid"])
            let payload: any = {}
            try {
                payload = JSON.parse(msg.payloadString)
            } catch {}

            const info: MethodInvocation = {
                method: methodName,
                seqNo: rid,
                payload,
            }
            this.emit("method", info)
        }
    }

    private publish(topic: string, payload: string | ArrayBuffer) {
        const msg = new MQTT.Message(payload)
        msg.destinationName = topic
        msg.qos = 0
        msg.retained = false
        if (this.client) this.client.send(msg)
        else this.toSend.push(msg)
    }

    finishMethod(seqNo: number, payload: any, status = 200) {
        this.publish(
            `$iothub/methods/res/${status}/?$rid=${seqNo}`,
            JSON.stringify(payload)
        )
    }

    private async connect() {
        if (this.client) return
        this.disabled = false

        const connStr = this.healthServer.parsedConnectionString()

        const iotHubHostName = connStr["HostName"]
        const deviceId = connStr["DeviceId"]

        if (!deviceId || !iotHubHostName) return

        this.clientId = deviceId
        this.healthServer.setConnectionStatus(
            AzureIotHubHealthConnectionStatus.Connecting
        )

        const url = `wss://${iotHubHostName}/$iothub/websocket?iothub-no-client-cert=true`
        this.log(`connecting to ${url}`)

        const client = new MQTT.Client(url, deviceId)
        this.client = client

        let sasToken = connStr["SharedAccessSignature"]

        if (!sasToken)
            // token valid until year 2255; in future we may try something more short-lived
            sasToken = await generateSasToken(
                `${iotHubHostName}/devices/${deviceId}`,
                connStr["SharedAccessKey"],
                9000000000
            )

        const disconnected = () => {
            if (this.client == client) {
                this.emitDisconnect()
                this.client = null
            }
        }

        client.onConnectionLost = info => {
            if (info.errorCode != 0) this.log("MQTT lost: " + info.errorMessage)
            disconnected()
        }
        client.onMessageArrived = this.handleMqttMsg.bind(this)

        client.connect({
            // reconnect: true, - TODO need some policy here
            userName: `${iotHubHostName}/${deviceId}/?api-version=2018-06-30`,
            password: "SharedAccessSignature " + sasToken,
            mqttVersion: 4,
            onSuccess: () => {
                this.log(`connected`)
                this.emit(CONNECT)
                this.healthServer.setConnectionStatus(
                    AzureIotHubHealthConnectionStatus.Connected
                )

                client.subscribe(methodPrefix + "#")

                const mm = this.toSend
                if (mm.length) {
                    this.toSend = []
                    for (const m of mm) client.send(m)
                }
            },
            onFailure: info => {
                this.log(`MQTT error: ${info.errorMessage}`)
                disconnected()
            },
        })
    }
}
