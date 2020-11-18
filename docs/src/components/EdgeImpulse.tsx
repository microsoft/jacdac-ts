import React, { useContext, useEffect, useState } from "react"
import { Box, Button, Card, CardActions, CardContent, CardHeader, CardMedia, CircularProgress, Collapse, Grid, Switch, TextField, Typography, useEventCallback, useTheme } from '@material-ui/core';
import { Link } from 'gatsby-theme-material-ui';
import useDbValue from "./useDbValue";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import useChange from "../jacdac/useChange";
import useGridBreakpoints from "./useGridBreakpoints";
import { JDRegister } from "../../../src/jdom/register";
import { JDClient } from "../../../src/jdom/client";
import DeviceCardHeader from "./DeviceCardHeader";
import Alert from "./Alert";
import useEffectAsync from "./useEffectAsync";
import { CHANGE, CONNECT, CONNECTING, CONNECTION_STATE, DISCONNECT, ERROR, PACKET_REPORT, PROGRESS, REPORT_RECEIVE, SensorAggregatorReg, SRV_MODEL_RUNNER, SRV_SENSOR_AGGREGATOR } from "../../../src/jdom/constants";
import FieldDataSet from "./FieldDataSet";
import { deviceSpecificationFromFirmwareIdentifier, isSensor } from "../../../src/jdom/spec";
import CircularProgressWithLabel from "./CircularProgressWithLabel";
import Trend from "./Trend"
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import GetAppIcon from '@material-ui/icons/GetApp';
import ServiceList from "./ServiceList";
import { ModelActions, ModelContent } from "./ModelUploader";
import { readBlobToUint8Array } from "../../../src/jdom/utils";
import useDeviceName from "./useDeviceName";
import { JDService } from "../../../src/jdom/service";
import ReadingFieldGrid from "./ReadingFieldGrid";
import useChartPalette from './useChartPalette';
import { SensorAggregatorClient, SensorAggregatorConfig } from "../../../src/jdom/sensoraggregatorclient";
import { AlertTitle } from "@material-ui/lab";
import { serviceName } from "../../../src/jdom/pretty";
import ConnectAlert from "./ConnectAlert";
import ApiKeyAccordion from "./ApiKeyAccordion";

const EDGE_IMPULSE_API_KEY = "edgeimpulseapikey"

const IDLE = "idle";
const STARTING = "starting";
const SAMPLING = "sampling";
const UPLOADING = "uploading";

const SAMPLING_STATE = "samplingState";

interface EdgeImpulseResponse {
    success: boolean;
    error?: string;
    // HTTP status code
    errorStatus?: number;
}

interface EdgeImpulseHello {
    hello?: boolean;
    err?: any;
}

interface EdgeImpulseSensorInfo {
    "name": string,
    "maxSampleLengthS": number,
    "frequencies": number[]
}

interface EdgeImpulseRemoteManagementInfo {
    version: number;
    apiKey: string;
    deviceId: string;
    deviceType: string;
    connection: string;
    sensors: EdgeImpulseSensorInfo[]
}

interface EdgeImpulseDeviceInfo {
    id: number;
    deviceId: string;
    name: string;
    created: string;
    lastSeen: string;
    deviceType: string;
    sensors: EdgeImpulseSensorInfo[]
}

interface EdgeImpulseDeviceResponse extends EdgeImpulseResponse {
    device?: EdgeImpulseDeviceInfo;
}

interface EdgeImpulseSample extends EdgeImpulseResponse {
    "label": string;
    "length": number;
    "path": string;
    "hmacKey": string;
    "interval": number;
    "sensor": string;
}

interface EdgeImpulseSampling extends EdgeImpulseSample {
    dataSet?: FieldDataSet;
    startTimestamp?: number;
    lastProgressTimestamp?: number;
    generatedFilename?: string;
    aggregatorConfig?: SensorAggregatorConfig;
    unsubscribers?: (() => void)[];
}

interface EdgeImpulseProjectInfo {
    id: number;
    name: string;
    logo?: string;
}

interface EdgeImpulseProject extends EdgeImpulseResponse {
    project: EdgeImpulseProjectInfo,
    devices: EdgeImpulseDeviceInfo[],
    impulse: {
        created: boolean;
        configured: boolean;
        complete: boolean;
    },
    dataSummary: {
        totalLengthMs: number;
        labels: string[];
        dataCount: number;
    },
    downloads: {
        name: string;
        type: string;
        size: string;
        link: string;
    }[];
}

interface EdgeImpulseProjects extends EdgeImpulseResponse {
    projects: EdgeImpulseProjectInfo[];
}

/*
A client for the EdgeImpulse remote management
https://docs.edgeimpulse.com/reference#remote-management
*/
class EdgeImpulseClient extends JDClient {
    private _ws: WebSocket;
    public connectionState = DISCONNECT;
    public samplingState = IDLE;
    private _hello: EdgeImpulseRemoteManagementInfo;
    private _sample: EdgeImpulseSampling;
    private _pingInterval: any;
    private pong: boolean;
    private aggregatorClient: SensorAggregatorClient;

    constructor(
        private readonly apiKey: string,
        private readonly aggregator: JDService,
        private readonly inputRegisters: JDRegister[],
        private readonly palette: string[]
    ) {
        super()

        this.handleMessage = this.handleMessage.bind(this);
        this.handleOpen = this.handleOpen.bind(this)
        this.handleError = this.handleError.bind(this);
        this.handleReport = this.handleReport.bind(this);
        this.handlePing = this.handlePing.bind(this);

        this.aggregatorClient = new SensorAggregatorClient(this.aggregator);
        this.aggregatorClient.subscribeSample(this.handleReport);

        this.mount(() => this.disconnect());
        this.mount(() => this.aggregatorClient.unmount());
    }

    get dataSet() {
        return this._sample?.dataSet;
    }

    disconnect() {
        this.clearSampling();
        if (this._pingInterval) {
            clearInterval(this._pingInterval)
            this._pingInterval = undefined;
        }
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
        const service = this.aggregator;
        const { device } = service;

        // fetch device spec
        const firmwareIdentifier = await service.device.resolveFirmwareIdentifier();
        const deviceSpec = deviceSpecificationFromFirmwareIdentifier(firmwareIdentifier);

        this._hello = {
            "version": 2,
            "apiKey": this.apiKey,
            "deviceId": device.deviceId,
            "deviceType": deviceSpec?.name || firmwareIdentifier?.toString(16) || "JACDAC device",
            "connection": "ip", // direct connection
            "sensors": [{
                "name": this.inputRegisters.map(reg => serviceName(reg.service.serviceClass)).join(','),
                "maxSampleLengthS": 10000,
                "frequencies": [50, 30, 20, 10]
            }]
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
        // response to ping?
        if (msg.data === "pong") {
            this.pong = true;
            return;
        }

        const data = JSON.parse(msg.data)
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

    get aggregatorConfig() {
        return this._sample?.aggregatorConfig;
    }

    private handleReport(row: number[]) {
        console.log(`ei: aggregator report`, this.connected, this.sampling)
        if (!this.connected) return; // ignore

        // partial data? ignore
        if (row.some(r => r === undefined))
            return;

        const { bus } = this.aggregator.device
        const { timestamp } = bus;
        // first sample, notify we're started
        if (this.samplingState == STARTING) {
            this._sample.startTimestamp = this._sample.lastProgressTimestamp = timestamp;
            this.send({ "sampleStarted": true });
            this.setSamplingState(SAMPLING);
        }
        // store sample
        if (this.samplingState == SAMPLING) {
            const ds = this.dataSet;
            ds.addRow(row);
            this.emit(REPORT_RECEIVE);

            // debounced progress update
            if (timestamp - this._sample.lastProgressTimestamp > 100) {
                this._sample.lastProgressTimestamp = timestamp;
                this.emit(PROGRESS, this.progress)
            }

            if (timestamp - this._sample.startTimestamp >= this._sample.length) {
                // first stop the sampling
                this.stopSampling();
                // we're done!
                this.emit(PROGRESS, this.progress)
                // and upload...
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

    private async startSampling(sample: EdgeImpulseSample) {
        this._sample = sample;
        this._sample.dataSet = FieldDataSet.create(this.aggregator.device.bus, this.inputRegisters, "sample", this.palette)
        this._sample.unsubscribers = [];
        this.send({ "sample": true })
        this.setSamplingState(STARTING);

        // prepare configuration
        this._sample.aggregatorConfig = {
            samplingInterval: this._sample.interval,
            samplesInWindow: 10,
            inputs: this.inputRegisters.map(reg => ({
                serviceClass: reg.service.serviceClass,
                deviceId: reg.service.device.deviceId,
                serviceIndex: reg.service.service_index
            }))
        }

        console.log(`ei: input`, this._sample.aggregatorConfig)
        // setup aggregator client
        await this.aggregatorClient.setInputs(this._sample.aggregatorConfig)
        // schedule data collection, ask a few more samples
        await this.aggregatorClient.collect(this._sample.length * 1.1);
    }

    private stopSampling() {
        const sample = this._sample;
        if (sample) {
            sample.unsubscribers.forEach(unsub => {
                try {
                    unsub();
                }
                catch (e) {
                    console.log(e)
                }
            })
            sample.unsubscribers = [];
        }
    }

    private clearSampling() {
        this.stopSampling();
        if (this._sample) {
            this._sample = undefined;
            this._hello = undefined;
            this.setSamplingState(IDLE);
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

        this.pong = true;
        this._pingInterval = setInterval(this.handlePing, 3000);
    }

    private handlePing() {
        if (!this.connected) return;

        if (!this.pong) {
            // the socket did not response
            console.log(`missing pong`)
            this.reconnect();
        } else {
            // send a new ping and wait for pong
            this.pong = false;
            this._ws.send("ping");
        }
    }

    get progress() {
        const timestamp = this.aggregator.device.bus.timestamp;
        return this.samplingState !== IDLE
            && (timestamp - this._sample.startTimestamp) / this._sample.length;
    }

    static async currentProjectInfo(apiKey: string): Promise<{
        valid: boolean,
        errorStatus?: number,
        project?: EdgeImpulseProject
    }> {
        if (!apiKey) return { valid: false };

        const rsj = await EdgeImpulseClient.apiFetch<EdgeImpulseProjects>(apiKey, "projects");
        if (!rsj.success) {
            return {
                valid: false,
                errorStatus: rsj.errorStatus
            }
        }

        // the API returns the current project when using the API key
        const projectId = rsj.projects?.[0]?.id;
        if (!rsj?.success || projectId === undefined) {
            return {
                valid: true,
                errorStatus: 402
            }
        }

        const project = await EdgeImpulseClient.apiFetch<EdgeImpulseProject>(apiKey, projectId);
        return {
            valid: true,
            errorStatus: project.errorStatus,
            project
        }
    }

    static async apiFetch<T extends EdgeImpulseResponse>(apiKey: string, path: string | number, body?: any): Promise<T> {
        const API_ROOT = "https://studio.edgeimpulse.com/v1/api/"
        const url = `${API_ROOT}${path}`
        const options: RequestInit = {
            method: body ? "POST" : "GET",
            headers: {
                "x-api-key": apiKey,
                "Accept": "application/json"
            },
            body: body && JSON.stringify(body)
        }
        if (options.method === "POST")
            options.headers["Content-Type"] = "application/json"

        const resp = await fetch(url, options)
        if (resp.status !== 200)
            return {
                success: false,
                errorStatus: resp.status,
                error: resp.statusText
            } as T;
        try {
            const payload = await resp.json() as T;
            return payload;
        } catch (e) {
            return {
                success: false,
                errorStatus: 500,
                error: e.message
            } as T;
        }
    }

    static async deviceInfo(apiKey: string, projectId: number, deviceId: string): Promise<EdgeImpulseDeviceResponse> {
        return await EdgeImpulseClient.apiFetch<EdgeImpulseDeviceResponse>(apiKey, `${projectId}/device/${deviceId}`)
    }

    static async renameDevice(apiKey: string, projectId: number, deviceId: string, name: string): Promise<EdgeImpulseResponse> {
        return await EdgeImpulseClient.apiFetch<EdgeImpulseResponse>(apiKey, `${projectId}/devices/${deviceId}/rename`, { name })
    }
}

function ApiKeyManager() {
    const validateKey = async (key: string) => {
        const r = await EdgeImpulseClient.currentProjectInfo(key)
        return {
            statusCode: (r?.valid && 200) || r?.errorStatus || 500
        }
    };
    return <ApiKeyAccordion
        apiName={EDGE_IMPULSE_API_KEY}
        validateKey={validateKey}
        instructions={<p>To get an <b>API key</b>, navigate to &nbsp;
            <Link to="https://studio.edgeimpulse.com/studio/8698/keys" target="_blank">https://studio.edgeimpulse.com/studio/8698/keys</Link>
            &nbsp; and generate a new key.</p>}
    />
}

function useEdgeImpulseProjectInfo(apiKey: string) {
    const [info, setInfo] = useState<EdgeImpulseProject>(undefined);

    useEffectAsync(async (mounted) => {
        if (!apiKey) {
            if (mounted())
                setInfo(undefined);
        } else {
            const r = await EdgeImpulseClient.currentProjectInfo(apiKey)
            if (mounted())
                setInfo(r?.project);
        }
    }, [apiKey])

    return info;
}

function ProjectInfo(props: { info: EdgeImpulseProject }) {
    const { info } = props;
    const disabled = !info?.success;

    return <Card>
        <CardHeader title={info?.project?.name || "..."}
            subheader={info?.dataSummary && `${info?.dataSummary?.dataCount} samples`}
        />
        {info?.project?.logo && <CardMedia image={info?.project?.logo} />}
        <CardActions>
            <Button disabled={disabled} target="_blank" href={`https://studio.edgeimpulse.com/studio/${info?.project?.id}/`} variant="contained" color="primary">Open EdgeImpulse</Button>
        </CardActions>
    </Card >
}

function ModelDownloadButton(props: { apiKey: string, info: EdgeImpulseProject, setModel: (blob: Uint8Array) => void }) {
    const { apiKey, info, setModel } = props;
    const theme = useTheme();
    const [downloading, setDownloading] = useState(false)
    const [error, setError] = useState("")
    const download = info?.downloads.find(download => download.type === "TensorFlow Lite (float32)");

    const handleDownload = (url: string) => async () => {
        try {
            setDownloading(true)
            setError("")
            const resp = await fetch(url, {
                headers: {
                    "x-api-key": apiKey
                }
            })
            const res = await resp.blob()
            const bytes = await readBlobToUint8Array(res);
            setModel(bytes)
        }
        catch (e) {
            console.log(e)
            setError("Oops, download failed.")
        }
        finally {
            setDownloading(false)
        }
    }

    return <Box mb={1}>
        {error && <Alert severity="error">{error}</Alert>}
        <Button
            variant="contained"
            disabled={!download || downloading}
            startIcon={downloading ? <CircularProgress size={theme.spacing(2)} /> : <GetAppIcon />}
            onClick={handleDownload(`https://studio.edgeimpulse.com${download?.link}`)}>DOWNLOAD MODEL</Button>
    </Box>
}

function AggregatorCard(props: {
    aggregator: JDService,
    selected: boolean,
    onChecked: () => void
}) {
    const { aggregator, selected, onChecked } = props;
    const { device } = aggregator;

    const handleChecked = () => onChecked();

    return <Card>
        <DeviceCardHeader device={device} showMedia={true} />
        <CardContent>
            <Switch checked={selected} onChange={handleChecked} />
        </CardContent>
    </Card>
}

function Acquisition(props: {
    aggregator: JDService,
    inputs: JDRegister[],
    apiKey: string,
    info: EdgeImpulseProjectInfo
}) {
    const { aggregator, inputs, apiKey, info } = props;

    const { device } = aggregator;
    const [client, setClient] = useState<EdgeImpulseClient>(undefined)
    const [error, setError] = useState("")
    const [connectionState, setConnectionState] = useState(DISCONNECT)
    const [samplingState, setSamplingState] = useState(IDLE)
    const [samplingProgress, setSamplingProgress] = useState(0)
    const [deviceInfo, setDeviceInfo] = useState<EdgeImpulseDeviceInfo>(undefined);
    const { deviceId } = device;
    const deviceName = useDeviceName(device, false);
    const projectId = info?.id;
    const palette = useChartPalette()

    const connected = connectionState === CONNECT;
    const sampling = samplingState !== IDLE
    const dataSet = client?.dataSet;
    const generatedSampleName = client?.generatedSampleName;
    const aggregatorConfig = client?.aggregatorConfig;

    useEffect(() => {
        if (!apiKey || !aggregator || !inputs?.length) {
            setClient(undefined);
            setError(undefined);
            return undefined;
        }
        else {
            console.log(`ei: start client`)
            const c = new EdgeImpulseClient(apiKey, aggregator, inputs, palette)
            c.connect();
            setClient(c);
            setError(undefined);
            return () => c.unmount();
        }
    }, [apiKey, aggregator, inputs?.map(ip => ip.id).join(",")])
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

    // name checking
    useEffectAsync(async () => {
        if (!apiKey || projectId === undefined) {
            setDeviceInfo(undefined)
        } else {
            const resp = await EdgeImpulseClient.deviceInfo(apiKey, projectId, deviceId);
            const info = resp.success && resp.device;
            if (info && info.name !== deviceName) {
                // no name assigned, use current
                if (info.name === deviceId) {
                    console.log(`ei: sync name`)
                    const rename = await EdgeImpulseClient.renameDevice(apiKey, projectId, deviceId, deviceName)
                    if (rename.success) {
                        info.name = deviceName;
                    }
                } else {
                    // name assigned in EI, pull it in
                    console.log(`ei: pull name`)
                    device.name = info.name;
                }
            }
            setDeviceInfo(info)
        }
    }, [apiKey, projectId, deviceName])

    return <Box>
        {connected && <Alert severity={"success"}>Connected to EdgeImpulse</Alert>}
        {error && <Alert severity={"error"}>{error}</Alert>}
        {sampling && <Alert severity={"info"}>
            <AlertTitle>Sampling...</AlertTitle>
            <CircularProgressWithLabel value={samplingProgress} />
        </Alert>}
        {!!dataSet && <Trend dataSet={dataSet} />}
        {generatedSampleName && <Typography variant="body2">sample name: {generatedSampleName}</Typography>}
        {aggregatorConfig && <pre>{JSON.stringify(aggregatorConfig, null, 2)}</pre>}
    </Box>
}

export default function EdgeImpulse(props: {}) {
    const { value: apiKey } = useDbValue(EDGE_IMPULSE_API_KEY, "")
    const { bus } = useContext<JDContextProps>(JACDACContext);
    const [model, setModel] = useState<Uint8Array>(undefined)
    const [registerIdsChecked, setRegisterIdsChecked] = useState<string[]>([])
    const [aggregatorId, setAggregatorId] = useState<string>("")
    const gridBreakPoints = useGridBreakpoints()
    const info = useEdgeImpulseProjectInfo(apiKey);

    const aggregators: JDService[] = useChange(bus, bus => bus.services({ serviceClass: SRV_SENSOR_AGGREGATOR }))
    const currentAggregator: JDService = aggregators.find(srv => srv.id == aggregatorId) || aggregators[0]
    const readingRegisters = useChange(bus, bus =>
        bus.devices().map(device => device
            .services().find(srv => isSensor(srv.specification))
            ?.readingRegister
        ).filter(reg => !!reg))
    const inputs = readingRegisters.filter(reg => registerIdsChecked.indexOf(reg.id) > -1)

    const handleAggregatorChecked = (srv: JDService) => () => {
        const id = srv?.id == aggregatorId ? '' : srv?.id
        setAggregatorId(id);
    }
    const handleRegisterCheck = (reg: JDRegister) => {
        const i = registerIdsChecked.indexOf(reg.id)
        if (i > -1)
            registerIdsChecked.splice(i, 1)
        else
            registerIdsChecked.push(reg.id)
        registerIdsChecked.sort()
        setRegisterIdsChecked([...registerIdsChecked])
    }

    return <>
        <ConnectAlert />
        <ApiKeyManager />
        <Box mb={1} />
        <ProjectInfo info={info} />
        <h3>Data</h3>
        <h4>Select Sensors</h4>
        {!readingRegisters?.length && <Alert severity="info">No sensor found...</Alert>}
        {!!readingRegisters.length && <ReadingFieldGrid
            readingRegisters={readingRegisters}
            registerIdsChecked={registerIdsChecked}
            handleRegisterCheck={handleRegisterCheck}
        />}
        <h4>Select Sensor Aggregator</h4>
        {!aggregators?.length && <Alert severity="info">No data aggregator found...</Alert>}
        <Grid container spacing={2}>
            {aggregators.map(aggregator => <Grid key={aggregator.id} item {...gridBreakPoints}>
                <AggregatorCard
                    aggregator={aggregator}
                    selected={currentAggregator === aggregator}
                    onChecked={handleAggregatorChecked(aggregator)} />
            </Grid>)}
        </Grid>
        <h4>Acquisition status</h4>
        {!currentAggregator && <Alert severity="info">No data aggregator selected...</Alert>}
        {!inputs?.length && <Alert severity="info">Select sensors to collect data from...</Alert>}
        {currentAggregator && !!inputs?.length && <Acquisition aggregator={currentAggregator} inputs={inputs} apiKey={apiKey} info={info?.project} />}
        <h3>Deployment</h3>
        {model && <Box mb={1}><Alert severity="success">Model downloaded!</Alert></Box>}
        <ModelDownloadButton apiKey={apiKey} info={info} setModel={setModel} />
        <ServiceList
            serviceClass={SRV_MODEL_RUNNER}
            content={service => <ModelContent service={service} />}
            actions={service => <ModelActions
                service={service}
                model={model}
            />}
            alertMissing={"No model runner found..."}
        />
    </>
}