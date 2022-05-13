import {
    TIMEOUT,
    DEVICE_CHANGE,
    DISCONNECT,
    JacscriptCloudCmd,
    JacscriptCloudCommandStatus,
    JacscriptCloudEvent,
    JacscriptCloudReg,
    SELF_ANNOUNCE,
    SRV_JACSCRIPT_CLOUD,
} from "../jdom/constants"
import { jdpack } from "../jdom/pack"
import { Packet } from "../jdom/packet"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDServerOptions, JDServiceServer } from "../jdom/servers/serviceserver"

export const UPLOAD = "upload"
export const CLOUD_COMMAND = "cloudCommand"

export interface JacscriptCloudUploadRequest {
    label: string
    args: number[]
}

export interface JacscriptCloudCommandResponse {
    status: JacscriptCloudCommandStatus
    args: number[]
}

export class JacscriptCloudServer extends JDServiceServer {
    readonly connectedRegister: JDRegisterServer<[boolean]>
    readonly connectionNameRegister: JDRegisterServer<[string]>
    private seqNo = 0
    private pending: Record<
        string,
        {
            timeout: number
            resolve: (resp: JacscriptCloudCommandResponse) => void
            reject: (reason?: unknown) => void
        }
    > = {}
    readonly controlled: boolean

    constructor(
        options?: {
            connectionName?: string
            controlled?: boolean
        } & JDServerOptions
    ) {
        super(SRV_JACSCRIPT_CLOUD, options)

        this.controlled = !!options?.controlled
        this.connectedRegister = this.addRegister(JacscriptCloudReg.Connected, [
            false,
        ])
        this.connectionNameRegister = this.addRegister(
            JacscriptCloudReg.ConnectionName,
            [options?.connectionName || ""]
        )
        this.addCommand(JacscriptCloudCmd.Upload, this.handleUpload.bind(this))
        this.addCommand(
            JacscriptCloudCmd.AckCloudCommand,
            this.handleAckCloudCommand.bind(this)
        )
        this.on(DEVICE_CHANGE, this.handleDeviceChange.bind(this))
    }

    private handleDeviceChange() {
        if (this.device) {
            this.device.on(DISCONNECT, this.clearPending.bind(this))
            this.device.on(SELF_ANNOUNCE, this.gcPending.bind(this))
        }
    }

    get connected() {
        return this.connectedRegister.values()[0]
    }

    set connected(value: boolean) {
        if (value !== this.connected) {
            this.connectedRegister.setValues([!!value])
            this.sendEvent(JacscriptCloudEvent.Change)
        }
    }

    private async handleUpload(pkt: Packet) {
        if (!this.connected) {
            console.debug(`cloud: cancel upload, not connected`)
            return
        }

        const [label, args] = pkt.jdunpack<[string, number[]]>("z f64[]")
        this.upload(label, args)
    }

    upload(label: string, args: number[]) {
        console.log("cloud: upload", { label, args })
        this.emit(UPLOAD, <JacscriptCloudUploadRequest>{ label, args })
    }

    sendCloudCommand(
        method: string,
        args: number[],
        timeout = 1000
    ): Promise<JacscriptCloudCommandResponse> {
        if (!this.connected) {
            console.debug(`cloud: cancel send, not connected`)
            return
        }
        const seqNo = this.seqNo++
        const payload = jdpack<[number, string, [number][]]>("u32 z f64[]", [
            seqNo,
            method,
            args.map(n => [n]),
        ])
        return new Promise<JacscriptCloudCommandResponse>((resolve, reject) => {
            console.log(
                `cloud: send ${seqNo} (${Object.keys(seqNo).length} pending)`
            )
            this.pending[seqNo] = {
                timeout: this.device.bus.timestamp + timeout,
                resolve,
                reject,
            }
            this.sendEvent(JacscriptCloudEvent.CloudCommand, payload)
        })
    }

    private async handleAckCloudCommand(pkt: Packet) {
        const [seqNo, status, args] =
            pkt.jdunpack<[number, JacscriptCloudCommandStatus, number[]]>(
                "u32 u32 f64[]"
            )
        console.log("cloud: ack-invoke", seqNo, status, args)
        const resp = { status, args }
        const req = this.pending[seqNo]
        if (req) {
            delete this.pending[seqNo]
            req.resolve(resp)
        }
    }

    private gcPending() {
        const now = this.device.bus.timestamp
        Object.entries(this.pending)
            .filter(([, req]) => req.timeout > now)
            .map(([key]) => {
                const reject = this.pending[key]?.reject
                delete this.pending[key]
                return reject
            })
            .filter(r => !!r)
            .forEach(r => r(TIMEOUT))
    }

    private clearPending() {
        const p = this.pending
        this.pending = {}
        Object.values(p).forEach(({ reject }) => reject())
    }
}
