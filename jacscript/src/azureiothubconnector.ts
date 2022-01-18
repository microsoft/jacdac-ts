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
    toHex,
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

        this.on(DISCONNECT, () => {
            this.healthServer.setConnectionStatus(
                AzureIotHubHealthConnectionStatus.Disconnected
            )
        })
        setInterval(() => {
            if (!this.disabled && !this.client) this.connect()
        }, 1000)
    }

    public upload(label: string, values: number[]) {
        const msg = new MQTT.Message(
            JSON.stringify({
                device: this.healthServer.device.deviceId,
                label,
                values,
            })
        )
        msg.qos = 0
        msg.retained = false
        msg.destinationName = `devices/${this.clientId}/messages/events/`
        if (this.client) this.client.send(msg)
        else this.toSend.push(msg)
    }

    private disconnect() {
        this.disabled = true
        const c = this.client
        this.client = null
        if (c) {
            try {
                c.disconnect()
            } catch {}
            this.emit(DISCONNECT)
        }
    }

    private log(msg: string) {
        console.log(`AzureIoT: ${msg}`)
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
                this.emit(DISCONNECT)
                this.client = null
            }
        }

        client.onConnectionLost = info => {
            if (info.errorCode != 0) this.log("MQTT lost: " + info.errorMessage)
            disconnected()
        }
        client.onMessageArrived = msg => {
            this.log("onMessageArrived:" + msg.payloadString)
        }

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
            },
            onFailure: info => {
                this.log(`MQTT error: ${info.errorMessage}`)
                disconnected()
            },
        })
    }
}
