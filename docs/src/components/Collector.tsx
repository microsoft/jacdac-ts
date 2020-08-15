import React, { useState, useContext, useEffect } from 'react';
// tslint:disable-next-line: no-submodule-imports
import { makeStyles, Theme } from '@material-ui/core/styles';
// tslint:disable-next-line: no-submodule-imports
import Tabs from '@material-ui/core/Tabs';
// tslint:disable-next-line: no-submodule-imports
import Tab from '@material-ui/core/Tab';
import { Paper, Grid, ButtonGroup, Button, ListItem, List, ListItemText, ListItemSecondaryAction, TextField, InputAdornment, createStyles, FormControl, ListSubheader, Switch, Card, CardActions, CardHeader, CardContent, Stepper, Step, StepLabel, StepContent, StepButton, FormGroup, FormControlLabel, Chip } from '@material-ui/core';
import DomTreeView from './DomTreeView';
import { JDRegister as JDField } from '../../../src/dom/register';
import JacdacContext from '../../../src/react/Context';
import RegisterInput from './RegisterInput'
import { IconButton } from 'gatsby-theme-material-ui';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import StopIcon from '@material-ui/icons/Stop';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import SaveAltIcon from '@material-ui/icons/SaveAlt';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import DeleteIcon from '@material-ui/icons/Delete';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import FiberManualRecordIcon from '@material-ui/icons/FiberManualRecord';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import FingerprintIcon from '@material-ui/icons/Fingerprint';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import RefreshIcon from '@material-ui/icons/Refresh';
import { SensorReg } from '../../../jacdac-spec/dist/specconstants';
import { prettyDuration, prettyUnit } from '../../../src/dom/pretty'
import useChange from '../jacdac/useChange';
import { setStreamingAsync } from '../../../src/dom/sensor';
import { DataSet } from './DataSet';
import Trend from './Trend';
// tslint:disable-next-line: no-submodule-imports
import Alert from '@material-ui/lab/Alert';
import DataSetTable from './DataSetTable';
import EventSelect from './EventSelect';
import { JDEvent } from '../../../src/dom/event';
import { EVENT } from '../../../src/dom/constants';

const useStyles = makeStyles((theme: Theme) => createStyles({
    root: {
        marginBottom: theme.spacing(1)
    },
    grow: {
        flexGrow: 1
    },
    field: {
        marginLeft: theme.spacing(1)
    },
    segment: {
        marginTop: theme.spacing(2),
        marginBottom: theme.spacing(2)
    },
    row: {
        margin: theme.spacing(0.5)
    },
    buttons: {
        margin: theme.spacing(0.5),
        marginLeft: theme.spacing(1),
        marginBottom: theme.spacing(2)
    },
    trend: {
        width: "10rem"
    },
    vmiddle: {
        verticalAlign: "middle"
    }
}));

function downloadUrl(url: string, name: string) {
    const a = document.createElement("a") as HTMLAnchorElement;
    document.body.appendChild(a);
    a.style.display = "none";
    a.href = url;
    a.download = name;
    a.click();
}

function downloadCSV(table: DataSet, sep: string) {
    const csv = table.toCSV(sep)
    const url = `data:text/plain;charset=utf-8,${encodeURI(csv)}`
    downloadUrl(url, `${table.name}.csv`)
}

const palette = [
    "#003f5c",
    "#ffa600",
    "#665191",
    "#a05195",
    "#ff7c43",
    "#d45087",
    "#f95d6a",
    "#2f4b7c",
]

const LIVE_HORIZON = 64
function createDataSet(fields: JDField[], name: string, live: boolean) {
    const headers = fields.map(field => field.prettyName)
    const units = fields.map(field => field.unit)
    const colors = fields.map((_, index) => palette[index % palette.length])
    const set = new DataSet(name,
        colors,
        headers,
        units)
    if (live)
        set.maxRows = LIVE_HORIZON + 10
    return set;
}

export default function Collector(props: {}) {
    const { } = props;
    const { bus } = useContext(JacdacContext)
    const classes = useStyles();
    const [fieldIdsChecked, setFieldIdsChecked] = useState<string[]>([])
    const [recording, setRecording] = useState(false)
    const [tables, setTables] = useState<DataSet[]>([])
    const [, setRecordingLength] = useState(0)
    const [prefix, setPrefix] = useState("data")
    const [samplingIntervalDelay, setSamplingIntervalDelay] = useState("100")
    const [samplingDuration, setSamplingDuration] = useState("10")
    const [liveDataSet, setLiveDataSet] = useState<DataSet>(undefined)
    const [, setLiveDataTimestamp] = useState(0)
    const [triggerEventId, setTriggerEventId] = useState<string>("")
    const readingRegisters = useChange(bus, bus =>
        bus.devices().map(device => device
            .services().find(srv => srv.readingRegister)
            ?.readingRegister
        ).filter(reg => !!reg))
    const recordingFields = fieldIdsChecked.map(id => bus.node(id) as JDField)
        .filter(f => !!f)
    const samplingIntervalDelayi = parseInt(samplingIntervalDelay)
    const samplingCount = Math.ceil(parseFloat(samplingDuration) * 1000 / samplingIntervalDelayi)
    const errorSamplingIntervalDelay = isNaN(samplingIntervalDelayi) || !/\d+/.test(samplingIntervalDelay)
    const errorSamplingDuration = isNaN(samplingCount)
    const error = errorSamplingDuration || errorSamplingIntervalDelay
    const triggerEvent = bus.node(triggerEventId) as JDEvent
    useEffect(() => {
        console.log(`trigger event`, triggerEventId, triggerEvent)
        return triggerEvent?.subscribe(EVENT, () => {
            toggleRecording()
        })
    }, [triggerEvent, recording])

    const newDataSet = (live: boolean) => fieldIdsChecked.length ? createDataSet(fieldIdsChecked.map(id => bus.node(id) as JDField).filter(f => !!f), `${prefix || "data"}${tables.length}`, live) : undefined
    const handleCheck = (field: JDField) => () => {
        const i = fieldIdsChecked.indexOf(field.id)
        if (i > -1) {
            fieldIdsChecked.splice(i, 1)
            setStreamingAsync(field.register.service, false)
        }
        else {
            fieldIdsChecked.push(field.id)
            setStreamingAsync(field.register.service, true)
            field.register.sendGetAsync() // at least some data
        }
        fieldIdsChecked.sort()
        setFieldIdsChecked([...fieldIdsChecked])
        setLiveDataSet(newDataSet(true))
    }
    const stopRecording = () => {
        if (recording) {
            setTables([liveDataSet, ...tables])
            setLiveDataSet(newDataSet(true))
            setRecording(false)
        }
    }
    const startRecording = () => {
        if (!recording && recordingFields.length) {
            setLiveDataSet(newDataSet(false))
            setRecording(true)
        }
    }
    const toggleRecording = () => {
        if (recording)
            stopRecording()
        else
            startRecording()
    }
    const handleSamplingIntervalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSamplingIntervalDelay(event.target.value.trim())
    }
    const handleSamplingDurationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSamplingDuration(event.target.value.trim())
    }
    const handlePrefixChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPrefix(event.target.value.trim())
    }
    const handleDownload = (table: DataSet) => () => {
        downloadCSV(table, ",")
    }
    const handleDeleteTable = (table: DataSet) => () => {
        const i = tables.indexOf(table)
        if (i > -1) {
            tables.splice(i, 1)
            setTables([...tables])
        }
    }
    const handleTriggerChange = (eventId: string) => setTriggerEventId(eventId)
    const handleIdentify = (device: JDDevice) => () => device.identify()
    const handleReset = (device: JDReset) => () => device.reset()

    // data collection
    // interval add data entry
    const addRow = () => {
        if (!liveDataSet) return;

        const row = recordingFields.map(f => f.value)
        liveDataSet.addExample(bus.timestamp, row)
        setLiveDataSet(liveDataSet);
        setRecordingLength(liveDataSet.rows.length)
        setLiveDataTimestamp(bus.timestamp)

        if (recording && liveDataSet.length >= samplingCount) {
            // stop recording
            stopRecording()
        }
    }
    // setting interval
    useEffect(() => {
        if (!error)
            recordingFields.forEach(field => field.register.service
                .register(SensorReg.StreamingInterval)
                .sendSetIntAsync(samplingIntervalDelayi)
            )
    }, [samplingIntervalDelayi, fieldIdsChecked, errorSamplingIntervalDelay])
    // collecting
    useEffect(() => {
        if (error) return undefined;
        const interval = setInterval(() => addRow(), samplingIntervalDelayi);
        return () => clearInterval(interval);
    }, [recording, samplingIntervalDelayi, samplingCount, fieldIdsChecked]);

    const sources = <Grid container spacing={2}>
        {!readingRegisters.length && <Alert className={classes.grow} severity="info">Waiting for sensor...</Alert>}
        {readingRegisters.map(register =>
            <Grid item xs={12} sm={6} md={4} key={'source' + register.id}>
                <Card>
                    <CardHeader subheader={register.service.name}
                        title={`${register.service.device.name}/${register.name}`}
                        action={
                            <React.Fragment>
                                <IconButton size="small" aria-label="identify" title="identify" onClick={handleIdentify(register.service.device)}>
                                    <FingerprintIcon />
                                </IconButton>
                                <IconButton size="small" aria-label="reset" title="reset" onClick={handleReset(register.service.device)}>
                                    <RefreshIcon />
                                </IconButton>
                            </React.Fragment>
                        } />
                    <CardContent>
                    </CardContent>
                    <CardActions>
                        <FormGroup>
                            {register.fields.map(field =>
                                <FormControlLabel key={field.id}
                                    control={<Switch disabled={recording} onChange={handleCheck(field)} checked={fieldIdsChecked.indexOf(field.id) > -1} />}
                                    label={<React.Fragment>
                                        {field.name}
                                        {!!prettyUnit(field.unit) && ` (${prettyUnit(field.unit)})`}
                                        {(liveDataSet && fieldIdsChecked.indexOf(field.id) > -1) && <FiberManualRecordIcon className={classes.vmiddle} fontSize="large" style={({ color: liveDataSet.colors[fieldIdsChecked.indexOf(field.id)] })} />}
                                    </React.Fragment>}
                                />)}
                        </FormGroup>
                    </CardActions>
                </Card>
            </Grid>)}
    </Grid>


    return (<div className={classes.root}>
        <div key="sensors">
            <h3>Choose sensors</h3>
            {sources}
        </div>
        <div key="record">
            <h3>Record data</h3>
            <div className={classes.buttons}>
                <Button
                    size="large"
                    variant="contained"
                    color={recording ? "secondary" : "primary"}
                    title="start/stop recording"
                    onClick={toggleRecording}
                    startIcon={recording ? <StopIcon /> : <PlayArrowIcon />}
                    disabled={!recordingFields?.length}
                >{recording ? "Stop" : "Start"}</Button>
            </div>
            <div className={classes.row}>
                <TextField
                    className={classes.field}
                    error={errorSamplingIntervalDelay}
                    disabled={recording}
                    label="Sampling interval"
                    value={samplingIntervalDelay}
                    variant="outlined"
                    InputProps={{
                        startAdornment: <InputAdornment position="start">ms</InputAdornment>,
                    }}
                    onChange={handleSamplingIntervalChange} />
                <TextField
                    className={classes.field}
                    error={errorSamplingDuration}
                    disabled={recording}
                    label="Sampling duration"
                    value={samplingDuration}
                    variant="outlined"
                    InputProps={{
                        startAdornment: <InputAdornment position="start">s</InputAdornment>,
                    }}
                    onChange={handleSamplingDurationChange} />
                <TextField
                    className={classes.field}
                    disabled={recording}
                    label="File name prefix"
                    value={prefix}
                    variant="outlined"
                    onChange={handlePrefixChange} />
                <EventSelect className={classes.field} eventId={triggerEventId} onChange={handleTriggerChange} label={"Start Event"} />
            </div>
        </div>
        {liveDataSet && <Trend key="trends" height={12} dataSet={liveDataSet} horizon={LIVE_HORIZON} dot={true} gradient={true} />}
        {liveDataSet && <DataSetTable key="datasettable" className={classes.segment} dataSet={liveDataSet} maxRows={3} minRows={3} />}
        {!!tables.length && <div key="recordings">
            <h3>Recordings</h3>
            <Grid container spacing={2}>
                {tables.map((table, index) =>
                    <Grid item xs={12} sm={6} md={4} key={`result` + table.id}>
                        <Card>
                            <CardHeader
                                title={table.name}
                                subheader={`${table.rows.length} rows, ${prettyDuration(table.duration)}`} />
                            <CardContent>
                                <div>{table.headers.join(', ')}</div>
                                <Trend dataSet={table} height={8} mini={true} />
                            </CardContent>
                            <CardActions>
                                <IconButton color="primary" onClick={handleDownload(table)}>
                                    <SaveAltIcon />
                                </IconButton>
                                <IconButton onClick={handleDeleteTable(table)}>
                                    <DeleteIcon />
                                </IconButton>
                            </CardActions>
                        </Card>
                    </Grid>)}
            </Grid>
        </div>}
    </div >
    )
}
