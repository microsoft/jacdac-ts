import { delay } from "../jdom/utils";
import { ISaveTextMessage } from "./protocol";
import { ITransport } from "./transport";

export interface IFileStorage {
    saveText(name: string, data: string): Promise<void>;
}

export class BrowserFileStorage implements IFileStorage {
    saveText(name: string, data: string, mimeType?: string): Promise<void> {
        if (!mimeType) {
            if (/\.csv/i.test(name))
                mimeType = "text/plain"
            else if (/\.json/i.test(name))
                mimeType = "application/json"
        }
        const url = `data:${mimeType || "text/plain"};charset=utf-8,${encodeURI(data)}`
        return this.downloadUrl(name, url)
    }

    private downloadUrl(name: string, url: string): Promise<void> {
        const a = document.createElement("a") as HTMLAnchorElement;
        document.body.appendChild(a);
        a.style.display = "none";
        a.href = url;
        a.download = name;
        a.click();
        return delay(100)
    }
}

export class HostedFileStorage implements IFileStorage {
    constructor(public readonly transport: ITransport) {
    }
    saveText(name: string, data: string): Promise<void> {
        return this.transport.postMessage({
            type: 'save-text',
            data: { name, data }
        } as ISaveTextMessage)
            .then(resp => { })
    }
}