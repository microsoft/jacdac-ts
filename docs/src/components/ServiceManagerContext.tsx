import React, { createContext } from "react";
import { delay } from "../../../src/dom/utils";

export interface IFileStorage {
    saveText(name: string, data: string): Promise<void>;
}

class BrowserFileStorage implements IFileStorage {
    saveText(name: string, data: string): Promise<void> {
        const url = `data:text/plain;charset=utf-8,${encodeURI(data)}`
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

export interface IMessage {
    id?: string;
    source: 'jacdac' | 'host',
    type: string;
    data: any;
    requireAck?: boolean;
}
export interface IAckMessage extends IMessage {
    type: 'ack';
    ackId?: string;
    data: {
        status: "success" | "error";
        data?: any;
        error?: any;
    }
}
export interface IStatusMessage extends IMessage {
    type: 'status',
    data: {
        status: 'ready' | 'error',
        data?: any;
        error?: any;
    }
}
export interface ISaveTextMessage extends IMessage {
    type: 'save-text';
    data: {
        name: string;
        data: string;
    }
}

export interface ITransport {
    postMessage(msg: IMessage): Promise<void>;
}
class IFrameTransport implements ITransport {
    constructor(public targetOrigin: string = "*") {
    }

    postReady() {
        this.postMessage({
            type: 'status',
            data: {
                status: 'ready'
            }
        } as IStatusMessage)
    }

    postMessage(msg: IMessage): Promise<void> {
        msg.id = "jd:" + Math.random()
        msg.source = "jacdac"
        window.parent.postMessage(msg, this.targetOrigin)
        return Promise.resolve();
    }
}

class HostedFileStorage implements IFileStorage {
    constructor(public readonly transport: ITransport) {
    }
    saveText(name: string, data: string): Promise<void> {
        return this.transport.postMessage({
            type: 'save-text',
            data: { name, data }
        } as ISaveTextMessage)
    }
}

export interface ServiceManagerContextProps {
    isHosted: boolean;
    fileStorage: IFileStorage;
}

const ServiceManagerContext = createContext<ServiceManagerContextProps>({
    isHosted: false,
    fileStorage: new BrowserFileStorage()
});
ServiceManagerContext.displayName = "Services";

export const ServiceManagerProvider = ({ children }) => {
    const isHosted = inIFrame();
    let fileStorage: IFileStorage = new BrowserFileStorage()
    if (isHosted) {
        console.log(`starting hosted services`)
        const transport = new IFrameTransport()
        fileStorage = new HostedFileStorage(transport)

        // notify host that we are ready
        transport.postReady()
    }
    const value = {
        isHosted,
        fileStorage
    }
    return <ServiceManagerContext.Provider value={value}>
        {children}
    </ServiceManagerContext.Provider>
}

function inIFrame() {
    try {
        return typeof window !== "undefined"
            && window.self !== window.top
    } catch (e) {
        return true;
    }
}

export default ServiceManagerContext;