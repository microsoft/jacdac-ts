import { CHANGE } from "../dom/constants";
import { JDEventSource } from "../dom/eventsource";
import { IFile, IFileLoadMessage, IModelListMessage } from "./protocol";
import { ITransport } from "./transport";

export abstract class ModelStore extends JDEventSource {
    abstract models(): IFile[];
    abstract async loadModel(model: IFile): Promise<any>;
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
        return this._models?.data.models.slice(0);
    }

    async loadModel(model: IFile): Promise<any> {
        const { path } = model;
        const ack = await this.transport.postMessage({
            type: 'file-load',
            requireAck: true,
            data: { path },
        } as IFileLoadMessage);
        return ack?.data;
    }
}