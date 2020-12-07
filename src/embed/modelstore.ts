import { CHANGE } from "../jdom/constants";
import { JDEventSource } from "../jdom/eventsource";
import { IFile, IFileContent, IFileLoadMessage, IModelListMessage } from "./protocol";
import { ITransport } from "./transport";

export abstract class ModelStore extends JDEventSource {
    abstract models(): IFile[];
    abstract inputConfigurations(): IFile[];
    abstract loadFile(model: IFile): Promise<any>;
}

export class HostedModelStore extends JDEventSource {
    private _models: IModelListMessage;

    constructor(public readonly transport: ITransport) {
        super();
        this.handleModelList = this.handleModelList.bind(this)

        this.transport.onMessage("model-list", this.handleModelList);
    }

    private handleModelList(msg: IModelListMessage) {
        this._models = msg;
        this.emit(CHANGE);
    }

    models(): IFile[] {
        return this._models?.data.models?.slice(0);
    }

    inputConfigurations(): IFile[] {
        return this._models?.data.inputConfigurations?.slice(0);
    }

    async loadFile(model: IFile): Promise<Blob> {
        const { path } = model;
        const ack = await this.transport.postMessage({
            type: 'file-load',
            requireAck: true,
            data: { path },
        } as IFileLoadMessage);

        const data = ack?.data?.data as IFileContent;
        if (!data)
            return undefined;

        const base64 = data.mimetype === 'application/octet-stream';
        const buffer = Buffer.from(data.content, base64 ? 'base64' : undefined);
        return new Blob(
            [buffer], { type: data.mimetype }
        );
    }
}