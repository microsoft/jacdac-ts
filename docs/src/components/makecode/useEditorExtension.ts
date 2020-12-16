import { useMemo, useState } from "react";
import useWindowEvent from "../hooks/useWindowEvent";
import { inIFrame } from "../../../../src/jdom/iframeclient";

export interface ReadResponse {
    asm?: string;
    code?: string;
    json?: string;
    jres?: string;
}

export const enum State {
    None = "",
    Loaded = "extloaded",
    Initialized = "extinit",
    Shown = "extshown",
    Hidden = "exthidden"
}


function init() {
    console.debug("initializing");
    const msg = mkRequest('extinit');
    window.parent.postMessage(msg, "*");
}

function read() {
    console.debug('requesting read code');
    const msg = mkRequest('extreadcode');
    window.parent.postMessage(msg, "*");
}

function readUser() {
    console.debug('requesting read user code')
    const msg = mkRequest('extusercode');
    window.parent.postMessage(msg, "*");
}

function write(code: string, json?: string, jres?: string, asm?: string) {
    console.debug('writing code:', code, json, jres, asm);
    const msg: any = mkRequest('extwritecode');
    msg.body = {
        code: code || undefined,
        json: json || undefined,
        jres: jres || undefined,
        asm: asm || undefined
    }
    window.parent.postMessage(msg, "*");
}

function queryPermission() {
    const msg: any = mkRequest('extquerypermission');
    window.parent.postMessage(msg, "*");
}

function requestPermission(console: boolean) {
    const msg: any = mkRequest('extrequestpermission');
    msg.body = {
        console
    }
    window.parent.postMessage(msg, "*");
}

function dataStream(console: boolean) {
    const msg: any = mkRequest('extdatastream');
    msg.body = {
        console
    }
    window.parent.postMessage(msg, "*");
}

const idToType: { [key: string]: string } = {};
function getExtensionId() {
    return inIFrame() ? window.location.hash.substr(1) : undefined;
}
const extensionId = getExtensionId();

function mkRequest(action: string) {
    const id = Math.random().toString();
    idToType[id] = action;
    return {
        type: "pxtpkgext",
        action: action,
        extId: extensionId,
        response: true,
        id: id
    }
}

export default () => {
    const [target, setTarget] = useState("");
    const [state, setState] = useState(State.None);
    const extensionId = useMemo(getExtensionId, []);

    const handleMessage = (msg: any) => {
        console.log({ msg })
        if (!msg.id) { // not a response
            switch (msg.event) {
                case "extinit":
                    setTarget(msg.target);
                    setState(msg.event);
                    break;
                case "extloaded":
                case "extshown":
                case "exthidden":
                    setState(msg.event);
                    break;
            }
            console.debug("received event: ", msg);
        }
        else {
            const action = idToType[msg.id];
            switch (action) {
                case "extinit":
                    client.emit('init', msg.resp);
                    break;
                case "extusercode":
                    client.emit('readuser', msg.resp);
                    break;
                case "extreadcode":
                    client.emit('read', msg.resp);
                    break;
                case "extwritecode":
                    client.emit('written', undefined);
                    break;
            }
        }
    }

    // reigster handled
    useWindowEvent("message", (ev: any) => {
        const msg = ev.data;
        if (msg?.type === "pxtpkgext")
            handleMessage(msg);
    }, false);

    return {
        target,
        state
    }
}