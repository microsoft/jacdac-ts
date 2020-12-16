import { useEffect, useState } from "react";
import { JDClient } from "../../../../src/jdom/client";
import { CHANGE, CONNECT, CONNECTING } from "../../../../src/jdom/constants";
import { inIFrame } from "../../../../src/jdom/iframeclient";

export interface ReadResponse {
    code?: string;
    json?: string;
    jres?: string;
}

export class MakeCodeEditorExtensionClient extends JDClient {
    private readonly pendingCommands: {
        [key: string]: {
            action: string;
            resolve: (resp: any) => void;
            reject: (e: any) => void;
        }
    } = {};
    private readonly extensionId: string = inIFrame() ? window.location.hash.substr(1) : undefined;
    private _target: any; // full apptarget
    private _connected = false;
    private _visible = false;

    constructor() {
        super();
        this.handleMessage = this.handleMessage.bind(this);
        if (typeof window !== "undefined") {
            window.addEventListener("message", this.handleMessage, false);
            this.mount(() => window.removeEventListener("message", this.handleMessage));
        }
        // always refresh on load
        this.on('shown', () => this.refresh());
        // notify parent that we're ready
        this.init();
    }

    get target() {
        return this._target;
    }

    get connected() {
        return this._connected;
    }

    get visible() {
        return this._visible;
    }

    private setVisible(vis: boolean) {
        if (this._visible !== vis) {
            this._visible = vis;
            this.emit(CHANGE);
        }
    }

    private nextRequestId = 1;
    private mkRequest(resolve: (resp: any) => void, reject: (e: any) => void, action: string, body?: any): any {
        const id = "jd_" + this.nextRequestId++;
        this.pendingCommands[id] = { action, resolve, reject };
        return {
            type: "pxtpkgext",
            action,
            extId: this.extensionId,
            response: true,
            id,
            body
        }
    }

    private sendRequest<T>(action: string, body?: any): Promise<T> {
        console.log(`mkcded ${this.extensionId}: send ${action}`)
        if (!this.extensionId)
            return Promise.resolve(undefined);

        return new Promise((resolve, reject) => {
            const msg = this.mkRequest(resolve, reject, action, body);
            window.parent.postMessage(msg, "*");
        })
    }

    private handleMessage(ev: any) {
        const msg = ev.data;
        if (msg?.type !== "pxtpkgext")
            return;
        console.log({ msg })
        if (!msg.id) {
            switch (msg.event) {
                case "extinit":
                    this._target = msg.target;
                    this._connected = true;
                    this.emit(CONNECT);
                    this.emit(CHANGE);
                    break;
                case "extshown":
                    this.setVisible(true)
                    this.emit('shown');
                    break;
                case "exthidden":
                    this.setVisible(false)
                    this.emit('hidden');
                    break;
                case "extdatastream":
                    this.emit('datastream', true);
                    break;
                default:
                    console.debug("Unhandled event", msg);
            }
            console.debug("received event: ", msg);
        }
        else {
            const { action, resolve, reject } = this.pendingCommands[msg.id];
            // continue async ops
            delete this.pendingCommands[msg.id];
            if (msg.success && resolve)
                resolve(msg.resp);
            else if (!msg.success && reject)
                reject(msg.resp);
            // raise event as well
            switch (action) {
                case "extinit":
                    this._connected = true;
                    this.emit(CONNECT);
                    this.emit(CHANGE);
                    break;
                case "extusercode":
                    // Loaded, set the target
                    this.emit('readuser', msg.resp);
                    break;
                case "extreadcode":
                    // Loaded, set the target
                    this.emit('read', msg.resp);
                    break;
                case "extwritecode":
                    this.emit('written', undefined);
                    break;
            }
        }
    }

    private async init() {
        console.log(`mkcd: init sequence`)
        await this.sendRequest<void>('extinit');
        console.log(`mkcd: connected`)
        await this.refresh();
    }

    private async refresh() {
        console.log(`mkcd: refresh`)
        const r = await this.read();
    }

    async read(): Promise<ReadResponse> {
        if (!this.extensionId) {
            const r: ReadResponse = {};
            this.emit('read', r);
            return r;
        } else {
            const resp: ReadResponse = await this.sendRequest('extreadcode');
            return resp;
        }
    }

    async readUser() {
        await this.sendRequest('extusercode')
    }

    async write(code: string, json?: string, jres?: string): Promise<void> {
        if (!this.extensionId) {
            // Write to local storage instead
            this.emit('written', undefined);
        } else {
            await this.sendRequest<void>('extwritecode', {
                code: code || undefined,
                json: json || undefined,
                jres: jres || undefined,
            })
        }
    }

    async queryPermission() {
        await this.sendRequest('extquerypermission');
    }

    async requestPermission(console: boolean) {
        await this.sendRequest('extrequestpermission', {
            console
        })
    }

    async dataStream(console: boolean) {
        await this.sendRequest('extdatastream', {
            console
        })
    }
}


export default function useMakeCodeEditorExtensionClient() {
    const [client, setClient] = useState<MakeCodeEditorExtensionClient>(undefined);
    useEffect(() => {
        let c = new MakeCodeEditorExtensionClient();
        setClient(c);
        return () => c?.unmount()
    }, []);
    return client;
}