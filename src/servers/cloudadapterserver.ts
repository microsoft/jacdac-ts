import {
    TIMEOUT,
    DEVICE_CHANGE,
    DISCONNECT,
    CloudAdapterCmd,
    CloudAdapterCommandStatus,
    CloudAdapterEvent,
    CloudAdapterReg,
    SELF_ANNOUNCE,
    SRV_CLOUD_ADAPTER,
    CHANGE,
} from "../jdom/constants"
import { jdpack } from "../jdom/pack"
import { Packet } from "../jdom/packet"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDServerOptions, JDServiceServer } from "../jdom/servers/serviceserver"

export const UPLOAD = "upload"
export const UPLOAD_BIN = "upload"
export const CLOUD_COMMAND = "cloudCommand"

export interface CloudAdapterUploadRequest {
    label: string
    args: number[]
}

export interface CloudAdapterUploadBinRequest {
    data: Uint8Array
}

export interface CloudAdapterCommandResponse {
    status: CloudAdapterCommandStatus
    args: number[]
}

export class CloudAdapterServer extends JDServiceServer {
    readonly connectedRegister: JDRegisterServer<[boolean]>
    readonly connectionNameRegister: JDRegisterServer<[string]>
    private seqNo = 0
    private pending: Record<
        string,
        {
            timeout: number
            resolve: (resp: CloudAdapterCommandResponse) => void
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
        super(SRV_CLOUD_ADAPTER, options)

        this.controlled = !!options?.controlled
        this.connectedRegister = this.addRegister(CloudAdapterReg.Connected, [
            false,
        ])
        this.connectionNameRegister = this.addRegister(
            CloudAdapterReg.ConnectionName,
            [options?.connectionName || ""]
        )
        this.addCommand(CloudAdapterCmd.Upload, this.handleUpload.bind(this))
        this.addCommand(
            CloudAdapterCmd.UploadBin,
            this.handleUploadBin.bind(this)
        )
        this.addCommand(
            CloudAdapterCmd.AckCloudCommand,
            this.handleAckCloudCommand.bind(this)
        )
        this.on(DEVICE_CHANGE, this.handleDeviceChange.bind(this))

        this.connectedRegister.on(CHANGE, () =>
            this.sendEvent(CloudAdapterEvent.Change)
        )
        this.connectionNameRegister.on(CHANGE, () =>
            this.sendEvent(CloudAdapterEvent.Change)
        )
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
            this.sendEvent(CloudAdapterEvent.Change)
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

    private async handleUploadBin(pkt: Packet) {
        if (!this.connected) {
            console.debug(`cloud: cancel upload, not connected`)
            return
        }

        const data = pkt.data
        this.uploadBin(data)
    }

    upload(label: string, args: number[]) {
        //console.log("cloud: upload", { label, args })
        this.emit(UPLOAD, <CloudAdapterUploadRequest>{ label, args })
    }

    uploadBin(data: Uint8Array) {
        //console.log("cloud: upload bin", { data })
        this.emit(UPLOAD_BIN, <CloudAdapterUploadBinRequest>{ data })
    }

    sendCloudCommand(
        method: string,
        args: number[],
        timeout = 1000
    ): Promise<CloudAdapterCommandResponse> {
        if (!this.connected) {
            console.debug(`cloud: cancel send, not connected`)
            return
        }
        const seqNo = this.seqNo++
        const payload = jdpack<[number, string, [number][]]>("u32 z r: f64", [
            seqNo,
            method,
            args.map(v => [v]),
        ])
        return new Promise<CloudAdapterCommandResponse>((resolve, reject) => {
            console.log(
                `cloud: send ${seqNo} (${Object.keys(seqNo).length} pending)`
            )
            this.pending[seqNo] = {
                timeout: this.device.bus.timestamp + timeout,
                resolve,
                reject,
            }
            this.sendEvent(CloudAdapterEvent.CloudCommand, payload)
        })
    }

    private async handleAckCloudCommand(pkt: Packet) {
        const [seqNo, status, args] =
            pkt.jdunpack<[number, CloudAdapterCommandStatus, number[]]>(
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
