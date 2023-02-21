import { delay } from "../jdom/utils"
import { EmbedSaveTextMessage } from "./protocol"
import { EmbedTransport } from "./transport"

export interface FileStorage {
    saveText(name: string, data: string): Promise<void>
}

export async function downloadUrl(url: string, name: string): Promise<void> {
    const a = document.createElement("a") as HTMLAnchorElement
    document.body.appendChild(a)
    a.style.display = "none"
    a.href = url
    a.download = name
    a.click()
    await delay(100)
    a.remove()
}

export class BrowserFileStorage implements FileStorage {
    saveText(name: string, data: string, mimeType?: string): Promise<void> {
        if (!mimeType) {
            if (/\.(csv|txt)/i.test(name)) mimeType = "text/plain"
            else if (/\.json/i.test(name)) mimeType = "application/json"
        }
        const url = `data:${
            mimeType || "text/plain"
        };charset=utf-8,${encodeURIComponent(data)}`
        return downloadUrl(url, name)
    }
}

export class HostedFileStorage implements FileStorage {
    constructor(public readonly transport: EmbedTransport) {}
    saveText(name: string, data: string): Promise<void> {
        return this.transport
            .postMessage({
                type: "save-text",
                data: { name, data },
            } as EmbedSaveTextMessage)
            .then(resp => {})
    }
}
