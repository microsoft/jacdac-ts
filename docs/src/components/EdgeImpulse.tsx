import React, { useContext, useEffect, useState } from "react"
import { Card, CardActions, CardContent, CardHeader, CircularProgress, Grid, TextField, Typography, useEventCallback, useTheme } from '@material-ui/core';
import { Button, Link } from 'gatsby-theme-material-ui';
import useDbValue from "./useDbValue";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { isSensor, startStreaming } from "../../../src/dom/sensor";
import useChange from "../jacdac/useChange";
import useGridBreakpoints from "./useGridBreakpoints";
import { JDRegister } from "../../../src/dom/register";
import { JDClient } from "../../../src/dom/client";
import DeviceCardHeader from "./DeviceCardHeader";
import Alert from "./Alert";
import useEffectAsync from "./useEffectAsync";
import { BaseReg, CHANGE, CONNECT, CONNECTING, CONNECTION_STATE, DISCONNECT, ERROR, PACKET_REPORT, PROGRESS, REPORT_RECEIVE } from "../../../src/dom/constants";
import FieldDataSet from "./FieldDataSet";
import { deviceSpecificationFromClassIdenfitier } from "../../../src/dom/spec";
import CircularProgressWithLabel from "./CircularProgressWithLabel";
import Trend from "./Trend"

const EDGE_IMPULSE_API_KEY = "edgeimpulseapikey"

const IDLE = "idle";
const STARTING = "starting";
const SAMPLING = "sampling";
const UPLOADING = "uploading";

const SAMPLING_STATE = "samplingState";

interface EdgeImpulseHello {
    hello?: boolean;
    err?: any;
}

interface EdgeImpulseDevice {
    version: number;
    apiKey: string;
    deviceId: string;
    deviceType: string;
    connection: string;
    sensors: {
        "name": string,
        "maxSampleLengthS": number,
        "frequencies": number[]
    }[]
}

interface EdgeImpulseSample {
    "label": string;
    "length": number;
    "path": string;
    "hmacKey": string;
    "interval": number;
    "sensor": string;

    dataSet?: FieldDataSet;
    startTimestamp?: number;
    lastProgressTimestamp?: number;
    generatedFilename?: string;
}

/*
A client for the EdgeImpulse remote management
https://docs.edgeimpulse.com/reference#remote-management
*/
class EdgeImpulseClient extends JDClient {
    private _ws: WebSocket;
    private _stopStreaming: () => void;
    public connectionState = DISCONNECT;
    public samplingState = IDLE;
    private _hello: EdgeImpulseDevice;
    private _sample: EdgeImpulseSample;

    constructor(private readonly apiKey: string, private readonly register: JDRegister) {
        super()

        this.handleMessage = this.handleMessage.bind(this);
        this.handleOpen = this.handleOpen.bind(this)
        this.handleError = this.handleError.bind(this);
        this.handleReport = this.handleReport.bind(this);

        // make sure to clean up
        this.mount(this.register.subscribe(REPORT_RECEIVE, this.handleReport));
        this.mount(() => this.disconnect());
    }

    get dataSet() {
        return this._sample?.dataSet;
    }

    disconnect() {
        this.stopSampling();
        // stop socket
        if (this._ws) {
            const w = this._ws;
            this._ws = undefined;
            try {
                w.close();
            }
            catch (e) {
            }
            finally {
                this.setConnectionState(DISCONNECT);
            }
        }
    }

    private setConnectionState(state: string) {
        if (this.connectionState !== state) {
            this.connectionState = state;
            this.emit(CONNECTION_STATE, this.connectionState);
            console.log(`ei: connection state changed`, this.connectionState)
        }
    }

    private setSamplingState(state: string) {
        if (this.samplingState !== state) {
            this.samplingState = state;
            this.emit(SAMPLING_STATE, this.samplingState)
            this.emit(CHANGE)
            console.log(`ei: sampling state changed`, this.samplingState)
        }
    }

    private send(msg: any) {
        this._ws?.send(JSON.stringify(msg))
    }

    private async handleOpen() {
        console.log(`ws: open`)
        const { service } = this.register;
        const { device } = service;

        // fetch device spec
        const deviceClass = await this.register.service.device.resolveDeviceClass();
        const deviceSpec = deviceSpecificationFromClassIdenfitier(deviceClass);

        this._hello = {
            "version": 2,
            "apiKey": this.apiKey,
            "deviceId": device.deviceId,
            "deviceType": deviceSpec?.name || deviceClass?.toString(16) || "JACDAC device",
            "connection": "ip", // direct connection
            "sensors": [
                {
                    "name": service.name,
                    "maxSampleLengthS": 10000,
                    "frequencies": [30, 60]
                }
            ]
        };
        this.send({
            "hello": this._hello
        })
    }

    private reconnect() {
        this.disconnect();
        this.connect();
    }

    private handleMessage(msg: any) {
        const data = JSON.parse(msg.data)
        console.log(`msg`, data)
        if (data.hello !== undefined) {
            const hello = data as EdgeImpulseHello;
            if (!hello.hello) {
                this.emit(ERROR, hello.err)
                this.disconnect();
            } else {
                this.setConnectionState(CONNECT);
            }
        } else if (data.sample) {
            const sample = data.sample as EdgeImpulseSample;
            this.startSampling(sample);
        }
    }

    get connected() {
        return this.connectionState === CONNECT;
    }

    get sampling() {
        return this.samplingState !== IDLE;
    }

    get generatedSampleName() {
        return this._sample?.generatedFilename;
    }

    private handleReport() {
        if (!this.connected) return; // ignore

        const timestamp = this.register.service.device.bus.timestamp;
        // first sample, notify we're started
        if (this.samplingState == STARTING) {
            this._sample.startTimestamp = this._sample.lastProgressTimestamp = timestamp;
            this.send({ "sampleStarted": true });
            this.setSamplingState(SAMPLING);
        }
        // store sample
        if (this.samplingState == SAMPLING) {
            const ds = this.dataSet;
            ds.addRow();
            this.emit(REPORT_RECEIVE);

            // debounced progress update
            if (timestamp - this._sample.lastProgressTimestamp > 100) {
                this._sample.lastProgressTimestamp = timestamp;
                this.emit(PROGRESS, this.progress)
            }

            if (timestamp - this._sample.startTimestamp >= this._sample.length) {
                // first stop the sampling
                this._stopStreaming?.();
                // we're done!
                this.emit(PROGRESS, this.progress)
                this.uploadData();
            }
        }
    }

    private uploadData(): Promise<void> {
        this.setSamplingState(UPLOADING);
        const ds = this.dataSet;
        const payload = {
            "protected": {
                "ver": "v1",
                "alg": "none",
                "iat": Date.now()
            },
            "signature": "",
            "payload": {
                "device_name": this._hello.deviceId,
                "device_type": this._hello.deviceType,
                "interval_ms": this._sample.interval,
                "sensors": ds.headers.map((h, i) => ({
                    "name": ds.headers[i],
                    "units": ds.units[i] || "/"
                })
                ),
                "values": ds.data(true)
            }
        }
        console.log(`payload`, payload)
        // upload dataset
        // https://docs.edgeimpulse.com/reference#ingestion-api
        return fetch(`https://ingestion.edgeimpulse.com${this._sample.path}`, {
            method: "POST",
            headers: {
                "x-api-key": this.apiKey,
                "x-label": this._sample.label,
                "x-file-name": ds.name,
                "x-disallow-duplicates": "true",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        }).then(async (resp) => {
            // response contains the filename
            const filename = await resp.text();
            this._sample.generatedFilename = filename;
        }).finally(() => {
            this.send({
                "sampleFinished": true
            })
            this.setSamplingState(IDLE);
        })
    }

    private handleError(ev: Event) {
        this.emit(ERROR, ev)
        this.reconnect();
    }

    private startSampling(sample: EdgeImpulseSample) {
        const { service, fields } = this.register;
        this._sample = sample;
        this._sample.dataSet = new FieldDataSet(
            this.register.service.device.bus,
            this._sample.label,
            fields
        );
        this.send({ "sample": true })
        this.setSamplingState(STARTING);

        // set interval
        const streamingIntervalRegister = service.register(BaseReg.StreamingInterval);
        // TODO ack
        streamingIntervalRegister.sendSetIntAsync(this._sample.interval);

        // start sampling
        this._stopStreaming = startStreaming(this.register.service)
    }

    private stopSampling() {
        // cleanup streaming
        this._sample = undefined;
        this._hello = undefined;
        if (this._stopStreaming) {
            try {
                this._stopStreaming();
            }
            catch (e) {
            }
            finally {
                this._stopStreaming = undefined;
                this.setSamplingState(IDLE);
            }
        }
    }

    connect() {
        if (this._ws) return; // already connected

        console.log(`ei: connect`)
        this.setConnectionState(CONNECTING)
        this._ws = new WebSocket("wss://remote-mgmt.edgeimpulse.com")
        this._ws.onmessage = this.handleMessage;
        this._ws.onopen = this.handleOpen;
        this._ws.onerror = this.handleError;
    }

    get progress() {
        const timestamp = this.register.service.device.bus.timestamp;
        return this.samplingState !== IDLE
            && (timestamp - this._sample.startTimestamp) / this._sample.length;
    }

    static async checkAPIKeyValid(apiKey: string): Promise<boolean> {
        if (!apiKey) return false;

        const r = await EdgeImpulseClient.fetchEdgeImpulse("GET", "projects", apiKey);
        if (r.status == 200) return true;
        else if (r.status == 403) return false;
        else return undefined;
    }

    static async fetchEdgeImpulse(method: "GET" | "POST", path: string, apiKey: string) {
        const API_ROOT = "https://studio.edgeimpulse.com/v1/api/"
        const url = `${API_ROOT}${path}`
        const options: RequestInit = {
            method,
            headers: {
                "Accept": "application/json",
                "x-api-key": apiKey
            }
        }
        return fetch(url, options)
    }
}

function ApiKeyManager() {
    const { value: apiKey, setValue: setApiKey } = useDbValue(EDGE_IMPULSE_API_KEY, "")
    const [key, setKey] = useState("")
    const [validated, setValidated] = useState(false)

    useEffectAsync(async (mounted) => {
        if (!apiKey) {
            if (mounted())
                setValidated(false)
        }
        else {
            const r = await EdgeImpulseClient.checkAPIKeyValid(apiKey)
            if (!mounted())
                return;
            if (r) {
                setValidated(r)
            } else {
                setValidated(false)
                if (r === false)
                    setApiKey(undefined)
            }
        }
    }, [apiKey])

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
            {validated && <Alert severity={"success"}>API key ready!</Alert>}
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

    const [client, setClient] = useState<EdgeImpulseClient>(undefined)
    const [error, setError] = useState("")
    const [connectionState, setConnectionState] = useState(DISCONNECT)
    const [samplingState, setSamplingState] = useState(IDLE)
    const [samplingProgress, setSamplingProgress] = useState(0)
    const connected = connectionState === CONNECT;
    const sampling = samplingState !== IDLE
    const dataSet = client?.dataSet;
    const generatedSampleName = client?.generatedSampleName;

    useEffect(() => {
        if (!apiKey || !register) {
            setClient(undefined);
            setError(undefined);
            return undefined;
        }
        else {
            console.log(`start client`)
            const c = new EdgeImpulseClient(apiKey, register)
            c.connect();
            setClient(c);
            setError(undefined);
            return () => c.unmount();
        }
    }, [register, apiKey])
    // subscribe to client changes
    useEffect(() => client?.subscribe(CONNECTION_STATE,
        (v: string) => setConnectionState(v))
        , [client])
    // subscribe to client changes
    useEffect(() => client?.subscribe(SAMPLING_STATE,
        (v: string) => setSamplingState(v))
        , [client])
    // listen to errors
    useEffect(() => client?.subscribe(ERROR, (e: string) => setError(e))
        , [client])
    // progress
    useEffect(() => client?.subscribe(PROGRESS, (p: number) => setSamplingProgress(p * 100))
        , [client])

    return <Card>
        <DeviceCardHeader device={device} />
        <CardContent>
            {error && <Alert severity={"error"}>{error}</Alert>}
            {connected && !sampling && <Alert severity={"success"}>Connected</Alert>}
            {sampling && <Alert severity={"info"}>Sampling...</Alert>}
            {!!dataSet && <Trend dataSet={dataSet} />}
            {sampling && <CircularProgressWithLabel value={samplingProgress} />}
            {generatedSampleName && <Typography variant="body2">sample name: {generatedSampleName}</Typography>}
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
            <Grid container spacing={2}>
                {readingRegisters.map(reg => <Grid item key={reg.id} {...gridBreakPoints}>
                    <ReadingRegister register={reg} apiKey={apiKey} />
                </Grid>)}
            </Grid>}
        <p></p>
        <ApiKeyManager />
    </>
}