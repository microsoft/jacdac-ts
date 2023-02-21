import { CHANGE } from "../jdom/constants"
import { JDEventSource } from "../jdom/eventsource"
import {
    EmbedFile,
    EmbedFileContent,
    EmbedFileLoadMessage,
    EmbedModelListMessage,
} from "./protocol"
import { EmbedTransport } from "./transport"

export abstract class ModelStore extends JDEventSource {
    abstract models(): EmbedFile[]
    abstract inputConfigurations(): EmbedFile[]
    abstract loadFile(model: EmbedFile): Promise<any>
}

export class HostedModelStore extends JDEventSource {
    private _models: EmbedModelListMessage

    constructor(public readonly transport: EmbedTransport) {
        super()
        this.handleModelList = this.handleModelList.bind(this)

        this.transport.onMessage("model-list", this.handleModelList)
    }

    private handleModelList(msg: EmbedModelListMessage) {
        this._models = msg
        this.emit(CHANGE)
    }

    models(): EmbedFile[] {
        return this._models?.data.models?.slice(0)
    }

    inputConfigurations(): EmbedFile[] {
        return this._models?.data.inputConfigurations?.slice(0)
    }

    async loadFile(model: EmbedFile): Promise<Blob> {
        const { path } = model
        const ack = await this.transport.postMessage({
            type: "file-load",
            requireAck: true,
            data: { path },
        } as EmbedFileLoadMessage)

        const data = ack?.data?.data as EmbedFileContent
        if (!data) return undefined

        const base64 = data.mimetype === "application/octet-stream"
        const buffer = Buffer.from(data.content, base64 ? "base64" : undefined)
        return new Blob([buffer], { type: data.mimetype })
    }
}
