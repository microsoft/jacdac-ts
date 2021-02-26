import React, { useEffect, useState } from "react"
import { JDClient } from "../../../../src/jdom/client"
import { CHANGE } from "../../../../src/jdom/constants";
import useChange from "../../../src/jacdac/useChange"
import { Button, Grid } from "@material-ui/core"

class ChromaClient extends JDClient {
    private connectionInfo: {
        sessionid: string;
        uri: string;
    }

    constructor() {
        super();
        this.mount(() => this.stop())
    }

    get connected() {
        return !!this.connectionInfo;
    }

    async start() {
        console.debug("razor: connecting")
        const resp = await fetch("https://chromasdk.io:54236/razer/chromasdk", {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                "title": "Microsoft Jacdac",
                "description": "Jacdac interface to Razer",
                "author": {
                    "name": "Microsoft",
                    "contact": "jacdac@microsoft.com"
                },
                "device_supported": [
                    "keyboard",
                    "mouse",
                    "headset",
                    "mousepad",
                    "keypad",
                    "chromalink"
                ],
                "category": "application"
            })
        });
        console.log({ resp })
        if (resp.status === 200) {
            this.connectionInfo = await resp.json()
            console.log({ uri: this.connectionInfo })
            this.emit(CHANGE)
        }
    }

    async stop() {
        if (this.connectionInfo) {
            console.debug("razor: disconnecting")
            const { uri } = this.connectionInfo;
            this.connectionInfo = undefined;
            try {
                await fetch(uri, {
                    method: "DELETE",
                    headers: { "content-type": "application/json" },
                });
            } catch (e) {
                console.debug(e)
            }
        }
    }

    async startHeadsetEffect(effect: "none" | "custom" | "static", data: number[] | number) {
        let body: unknown;
        const ceffect = `CHROMA_${effect.toUpperCase()}`;
        if (ceffect === "CHROMA_NONE") {
            body = { "effect": ceffect };
        } else if (ceffect === "CHROMA_CUSTOM") {
            body = { "effect": ceffect, "param": data };
        } else if (ceffect === "CHROMA_STATIC") {
            const color = { "color": data };
            body = { "effect": ceffect, "param": color };
        }
        await this.fetch("/headset", "PUT", body);
    }

    private fetch(path: string, method: string, body: unknown) {
        return fetch(this.connectionInfo.uri + path, {
            method, body: JSON.stringify(body), headers: { "content-type": "application/json" }
        })
    }
}

export default function Chroma() {
    const [client] = useState(new ChromaClient());
    const connected = useChange(client, c => c.connected);
    // make sure to cleanup
    useEffect(() => {
        client.start() // async
        return () => client.stop();
    }, []);

    const handleStatic = (v: number) => async () => {
        await client.startHeadsetEffect("static", v);
    }

    return <Grid container spacing={1}>
        <Grid item>
            <div>connected: {connected ? "connected" : "disconnected"}</div>
        </Grid>
        <Grid item>
            <Button onClick={handleStatic(255)}>headset red</Button>
            <Button onClick={handleStatic(128)}>headset red</Button>
        </Grid>
    </Grid>
}