import {
    CloudAdapterCmd,
    CloudAdapterEvent,
    CloudAdapterReg,
    SRV_CLOUD_ADAPTER,
    CHANGE,
    CloudAdapterCmdPack,
} from "../jdom/constants"
import { Packet } from "../jdom/packet"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDServerOptions, JDServiceServer } from "../jdom/servers/serviceserver"

export const UPLOAD_JSON = "upload"
export const UPLOAD_BIN = "uploadBin"
export const CLOUD_COMMAND = "cloudCommand"

export interface CloudAdapterUploadJSONRequest {
    json: string
}

export interface CloudAdapterUploadBinRequest {
    data: Uint8Array
}

export class CloudAdapterServer extends JDServiceServer {
    readonly connectedRegister: JDRegisterServer<[boolean]>
    readonly connectionNameRegister: JDRegisterServer<[string]>
    readonly controlled: boolean

    constructor(
        options?: {
            connectionName?: string
            controlled?: boolean
        } & JDServerOptions,
    ) {
        super(SRV_CLOUD_ADAPTER, options)

        this.controlled = !!options?.controlled
        this.connectedRegister = this.addRegister(CloudAdapterReg.Connected, [
            false,
        ])
        this.connectionNameRegister = this.addRegister(
            CloudAdapterReg.ConnectionName,
            [options?.connectionName || ""],
        )
        this.addCommand(
            CloudAdapterCmd.UploadJson,
            this.handleUpload.bind(this),
        )
        this.addCommand(
            CloudAdapterCmd.UploadBinary,
            this.handleUploadBin.bind(this),
        )
        this.connectedRegister.on(CHANGE, () =>
            this.sendEvent(CloudAdapterEvent.Change),
        )
        this.connectionNameRegister.on(CHANGE, () =>
            this.sendEvent(CloudAdapterEvent.Change),
        )
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

        const [json] = pkt.jdunpack<[string]>(CloudAdapterCmdPack.UploadJson)
        this.uploadJSON(json)
    }

    private async handleUploadBin(pkt: Packet) {
        if (!this.connected) {
            console.debug(`cloud: cancel upload, not connected`)
            return
        }

        const data = pkt.data
        this.uploadBin(data)
    }

    uploadJSON(json: string) {
        this.emit(UPLOAD_JSON, <CloudAdapterUploadJSONRequest>{
            json,
        })
    }

    uploadBin(data: Uint8Array) {
        this.emit(UPLOAD_BIN, <CloudAdapterUploadBinRequest>{ data })
    }
}
