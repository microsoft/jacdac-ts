import { CHANGE } from "../dom/constants";
import { JDEventSource } from "../dom/eventsource";
import { IFile, IFileContent, IFileLoadMessage, IModelListMessage } from "./protocol";
import { ITransport } from "./transport";

export abstract class ModelStore extends JDEventSource {
    abstract models(): IFile[];
    abstract inputConfigurations(): IFile[];
    abstract async loadFile(model: IFile): Promise<any>;
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

        const data = ack?.data as IFileContent;
        if (!data)
            return undefined;

        console.log('data', data)
        if (data.mimetype === 'application/octet-stream') {
            const buffer = Buffer.from(data.content, 'base64');
            console.log(`buffer`, buffer)
            return new Blob(
                [buffer], { type: 'application/octet-stream' }
            );
        }
        else {
            console.log(`blog`, data.mimetype, data.content)
            return new Blob(
                [data.content],
                { type: data.mimetype });
        }
    }
}