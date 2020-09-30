import React, { useContext, useEffect, useState } from "react"
import { Card, CardActions, CardContent, CardHeader, Grid, TextField, useEventCallback } from '@material-ui/core';
import { Button, Link } from 'gatsby-theme-material-ui';
import useDbValue from "./useDbValue";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { isSensor, startStreaming } from "../../../src/dom/sensor";
import useChange from "../jacdac/useChange";
import useGridBreakpoints from "./useGridBreakpoints";
import { JDRegister } from "../../../src/dom/register";
import DeviceCardHeader from "./DeviceCardHeader";
import Alert from "./Alert";
import useEffectAsync from "./useEffectAsync";
import useEventRaised from "../jacdac/useEventRaised";
import { PACKET_REPORT } from "../../../src/dom/constants";

const EDGE_IMPULSE_API_KEY = "edgeimpulseapikey"
const API_ROOT = "https://studio.edgeimpulse.com/v1/api/"

async function requestJSON<T>(method: "GET" | "POST", path: string, apiKey: string): Promise<T> {
    const url = `${API_ROOT}${path}`
    const options: RequestInit = {
        method,
        headers: {
            "Accept": "application/json",
            "x-api-key": apiKey
        }
    }
    const resp = await fetch(url, options)
    switch (resp.status) {
        case 200:
            const payload = await resp.json();
            return payload as T;
        default:
            throw Error(`request failed (${resp.status})`)
    }
}

function ApiKeyManager() {
    const { value: apiKey, setValue: setApiKey } = useDbValue(EDGE_IMPULSE_API_KEY, "")
    const [key, setKey] = useState("")

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setKey(event.target.value)
    }
    const handleSave = () => {
        setApiKey(key)
        setKey("")
    }
    const handleReset = () => {
        setApiKey("")
    }

    return <Card>
        <CardHeader
            title="API Key Configuration"
        />
        <CardContent>
            <p>To get an <b>API key</b>, navigate to &nbsp;
            <Link to="https://studio.edgeimpulse.com/" target="_blank">https://studio.edgeimpulse.com/</Link>;
            select your project, click <b>Keys</b> and generate a new key.</p>
            <TextField
                autoFocus
                label="API key"
                fullWidth
                value={key}
                onChange={handleChange}
            />
        </CardContent>
        <CardActions>
            <Button disabled={!key} variant="contained" color="primary" onClick={handleSave}>Save</Button>
            <Button disabled={!apiKey} variant="contained" onClick={handleReset}>Clear</Button>
        </CardActions>
    </Card>
}

function ReadingRegister(props: { register: JDRegister, apiKey: string }) {
    const { register, apiKey } = props
    const { service } = register;
    const { device } = service;

    const [state, setState] = useState<"" | "connected">("")
    const [error, setError] = useState("")
    const [streaming, setStreaming] = useState(false)
    const connected = state === "connected"

    // start top streaming
    useEffect(() => streaming && startStreaming(register.service)
        , [register, apiKey, streaming])

    // record reports
    useEventRaised(PACKET_REPORT, register, r => {
        console.log(`report`, register.id, register.intValue)
    })

    // https://docs.edgeimpulse.com/reference#remote-management
    useEffectAsync(async () => new Promise((resolve, reject) => {
        console.log(`ei: opening socket`, register.id)

        setError("");

        const ws = new WebSocket("wss://remote-mgmt.edgeimpulse.com")
        ws.onmessage = (msg) => {
            const data = JSON.parse(msg.data)
            console.log(`ei: msg`, register.id, data)
            if (data.hello !== undefined) {
                if (!data.hello) {
                    setState("");
                    setError(data.err)
                    ws.close();
                    console.log(`ei: hello error ${data.err}`, register.id)
                } else {
                    setState("connected");
                    console.log(`ei: connected`, register.id)
                }
            } else if (data.sample) {
                // start sampling
                console.log(`ei: sampling`, register.id);
                ws.send(JSON.stringify({
                    "sample": true
                }))
                ws.send(JSON.stringify({
                    "sampleStarted": true
                }))
            }
        }
        ws.onopen = () => {
            console.log(`ei: send hello`, register.id)
            ws.send(JSON.stringify({
                "hello": {
                    "version": 2,
                    "apiKey": apiKey,
                    "deviceId": device.deviceId,
                    "deviceType": "demo",
                    "connection": "ip",
                    "sensors": [
                        {
                            "name": service.name,
                            "maxSampleLengthS": 10000,
                            "frequencies": [30, 60]
                        }
                    ]
                }
            }))
            if (resolve) {
                const r = resolve;
                resolve = undefined;
                reject = undefined;
                r();
            }
        }
        ws.onerror = (error) => {
            if (reject) {
                const r = reject;
                resolve = undefined;
                reject = undefined;
                r(error);

                setError(error.toString())
                setState("")
            }
        }
        ws.onclose = () => {
            setState("");
        }

        return () => {
            try {
                ws.close();
            }
            catch (e) {
                console.log(`ignored`, e)
            }
        }
    }), [register, apiKey])

    return <Card>
        <DeviceCardHeader device={device} />
        <CardContent>
            {error && <Alert severity={"error"}>{error}</Alert>}
            {connected && <Alert severity={"success"}>Connected</Alert>}
        </CardContent>
    </Card>
}

export default function EdgeImpulse(props: {}) {
    const { value: apiKey } = useDbValue(EDGE_IMPULSE_API_KEY, "")
    const { bus } = useContext<JDContextProps>(JACDACContext);
    const gridBreakPoints = useGridBreakpoints()

    const readingRegisters = useChange(bus, bus =>
        bus.devices().map(device => device
            .services().find(srv => isSensor(srv))
            ?.readingRegister
        ).filter(reg => !!reg))

    return <>
        {apiKey &&
            <Grid container>
                {readingRegisters.map(reg => <Grid item key={reg.id} {...gridBreakPoints}>
                    <ReadingRegister register={reg} apiKey={apiKey} />
                </Grid>)}
            </Grid>}
        <p></p>
        <ApiKeyManager />
    </>
}