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
        }
    } = {};
    private readonly extensionId: string = inIFrame() ? window.location.hash.substr(1) : undefined;
    private _target: string;
    private _connected = false;
    private _visible = false;

    constructor() {
        super();
        this.handleMessage = this.handleMessage.bind(this);
        this.mount(() => {
            //ssr
            if (typeof window === "undefined")
                return () => { };

            window.addEventListener("message", this.handleMessage, false);
            return () => window.removeEventListener("message", this.handleMessage);
        })
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
    private mkRequest(resolve: (resp: any) => void, action: string, body?: any): any {
        const id = this.nextRequestId++;
        this.pendingCommands[id] = { action, resolve };
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
        console.log(`mkcded: send ${action}`)
        if (!this.extensionId)
            return Promise.resolve(undefined);

        return new Promise((resolve, reject) => {
            const msg = this.mkRequest(resolve, action, body);
            window.parent.postMessage(msg, "*");
        })
    }

    private handleMessage(ev: any) {
        const msg = ev.msg;
        console.log({ msg })
        if (msg.type !== "pxtpkgext") return;
        if (!msg.id) {
            const target = msg.target;
            if (target !== this._target) {
                this._target = target;
                this.emit(CHANGE);
            }
            switch (msg.event) {
                case "extinit":
                    this.emit(CONNECTING)
                    this.emit(CHANGE);
                    break;
                case "extloaded":
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
            const { action, resolve } = this.pendingCommands[msg.id];
            // continue async ops
            delete this.pendingCommands[msg.id];
            if (resolve)
                resolve(msg.resp);
            // raise event as well
            switch (action) {
                case "extinit":
                    // Loaded, set the target
                    this.emit('init', msg.resp);
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

    async init() {
        await this.sendRequest<void>('extinit');
    }

    async read() {
        if (!this.extensionId) {
            this.emit('read', {});
        } else {
            await this.sendRequest('extreadcode');
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