import React, { useState, useContext, useEffect } from 'react';
// tslint:disable-next-line: no-submodule-imports
import { makeStyles, Theme } from '@material-ui/core/styles';
import { Grid, Button, TextField, InputAdornment, createStyles, Switch, Card, CardActions, CardHeader, CardContent, FormGroup, FormControlLabel, PaletteType } from '@material-ui/core';
import { JDField } from '../../../src/dom/field';
import JACDACContext, { JDContextProps } from '../../../src/react/Context';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import StopIcon from '@material-ui/icons/Stop';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import SaveIcon from '@material-ui/icons/Save';
import useChange from '../jacdac/useChange';
import ConnectButton from '../jacdac/ConnectButton';
import { isSensor, startStreaming } from '../../../src/dom/sensor';
import { BusState, JDBus } from '../../../src/dom/bus'
import FieldDataSet from './FieldDataSet';
import Trend from './Trend';
// tslint:disable-next-line: no-submodule-imports
import Alert from "./Alert";
import EventSelect from './EventSelect';
import { JDEvent } from '../../../src/dom/event';
import { EVENT, SRV_ROLE_MANAGER, SRV_SENSOR_AGGREGATOR } from '../../../src/dom/constants';
import { arrayConcatMany, throttle } from '../../../src/dom/utils';
import DataSetGrid from './DataSetGrid';
import { JDRegister } from '../../../src/dom/register';
import ReadingFieldGrid from './ReadingFieldGrid';
import DeviceCardHeader from './DeviceCardHeader';
import { SensorAggregatorClient, SensorAggregatorConfig } from '../../../src/dom/sensoraggregatorclient';
import DarkModeContext from './DarkModeContext';
import { Link } from 'gatsby-theme-material-ui';
import { JDService } from '../../../src/dom/service';
import ServiceManagerContext from './ServiceManagerContext';
import RoleManagerService from './RoleManagerService'
import { useChartPalette } from './useChartPalette';

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

const LIVE_HORIZON = 24
function createDataSet(bus: JDBus,
    registers: JDRegister[],
    name: string,
    live: boolean,
    palette: string[]) {
    const fields = arrayConcatMany(registers.map(reg => reg.fields))
    const colors = fields.map((f, i) => palette[i % palette.length])
    const set = new FieldDataSet(bus, name, fields, colors)
    if (live)
        set.maxRows = LIVE_HORIZON + 4

    return set;
}

export default function Collector(props: {}) {
    const { } = props;
    const { bus, connectionState } = useContext<JDContextProps>(JACDACContext)
    const classes = useStyles();
    const { fileStorage } = useContext(ServiceManagerContext)
    const [registerIdsChecked, setRegisterIdsChecked] = useState<string[]>([])
    const [aggregatorId, setAggregatorId] = useState<string>("")
    const [recording, setRecording] = useState(false)
    const [tables, setTables] = useState<FieldDataSet[]>([])
    const [, setRecordingLength] = useState(0)
    const [prefix, setPrefix] = useState("data")
    const [samplingIntervalDelay, setSamplingIntervalDelay] = useState("100")
    const [samplingDuration, setSamplingDuration] = useState("10")
    const [liveDataSet, setLiveDataSet] = useState<FieldDataSet>(undefined)
    const [, setLiveDataTimestamp] = useState(0)
    const [triggerEventId, setTriggerEventId] = useState<string>("")
    const chartPalette = useChartPalette()
    const readingRegisters = useChange(bus, bus =>
        bus.devices().map(device => device
            .services().find(srv => isSensor(srv))
            ?.readingRegister
        ).filter(reg => !!reg))
    const recordingRegisters = readingRegisters
        .filter(reg => registerIdsChecked.indexOf(reg.id) > -1)
    const aggregators: JDService[] = useChange(bus, bus => bus.services({ serviceClass: SRV_SENSOR_AGGREGATOR }))
    const aggregator: JDService = aggregators.find(srv => srv.id == aggregatorId)
    const roleManager: JDService = aggregator?.device.services({ serviceClass: SRV_ROLE_MANAGER })[0]
    const samplingIntervalDelayi = parseInt(samplingIntervalDelay)
    const samplingCount = Math.ceil(parseFloat(samplingDuration) * 1000 / samplingIntervalDelayi)
    const errorSamplingIntervalDelay = isNaN(samplingIntervalDelayi) || !/\d+/.test(samplingIntervalDelay)
    const errorSamplingDuration = isNaN(samplingCount)
    const error = errorSamplingDuration || errorSamplingIntervalDelay
    const triggerEvent = bus.node(triggerEventId) as JDEvent;
    const startEnabled = !!recordingRegisters?.length

    useEffect(() => {
        //console.log(`trigger event`, triggerEventId, triggerEvent)
        const un = triggerEvent?.subscribe(EVENT, () => {
            //console.log(`trigger toggle recoring`, recording)
            toggleRecording()
        })
        //console.log(`mounted`, triggerEvent)
        return () => {
            //console.log(`unmount trigger`)
            if (un) un()
        }
    }, [triggerEvent, recording, registerIdsChecked, liveDataSet])

    const createSensorConfig = () => ({
        samplingInterval: samplingIntervalDelayi,
        samplesInWindow: 10,
        inputs: recordingRegisters.map(reg => ({
            serviceClass: reg.service.serviceClass
        }))
    })
    const saveConfig = () => {
        const sensorConfig = JSON.stringify(createSensorConfig(), null, 2)
        fileStorage.saveText(`${prefix || "jacdac"}-sensor-config.json`, sensorConfig)
    }
    const newDataSet = (registerIds: string[], live: boolean) => registerIds.length
        ? createDataSet(
            bus,
            readingRegisters.filter(reg => registerIds.indexOf(reg.id) > -1),
            `${prefix || "data"}${tables.length}`,
            live,
            chartPalette)
        : undefined
    const handleRegisterCheck = (reg: JDRegister) => {
        const i = registerIdsChecked.indexOf(reg.id)
        if (i > -1)
            registerIdsChecked.splice(i, 1)
        else
            registerIdsChecked.push(reg.id)
        registerIdsChecked.sort()
        setRegisterIdsChecked([...registerIdsChecked])
        setLiveDataSet(newDataSet(registerIdsChecked, true))
    }
    const stopRecording = () => {
        if (recording) {
            //console.log(`stop recording`, liveDataSet)
            setTables([liveDataSet, ...tables])
            setLiveDataSet(newDataSet(registerIdsChecked, true))
            setRecording(false)
        }
    }
    const startRecording = async () => {
        if (!recording && recordingRegisters.length) {
            setLiveDataSet(newDataSet(registerIdsChecked, false))
            setRecording(true)
            if (aggregator) {
                const client = new SensorAggregatorClient(aggregator)
                await client.setInputs(createSensorConfig())
                client.collect(samplingCount)
            }
        }
    }
    const startStreamingRegisters = () => {
        console.log(`start streaming`)
        const streamers = recordingRegisters?.map(reg => startStreaming(reg.service))
        return () => {
            console.log(`stop streaming`)
            streamers.map(streamer => streamer())
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
    const handleTriggerChange = (eventId: string) => setTriggerEventId(eventId)
    const handleDeleteTable = (table: FieldDataSet) => {
        const i = tables.indexOf(table)
        if (i > -1) {
            tables.splice(i, 1)
            setTables([...tables])
        }
    }
    const handleAggregatorChecked = (srv: JDService) => () => {
        const id = srv?.id == aggregatorId ? '' : srv?.id
        setAggregatorId(id);
    }
    const updateLiveData = () => {
        setLiveDataSet(liveDataSet);
        setRecordingLength(liveDataSet.rows.length)
        setLiveDataTimestamp(bus.timestamp)
    }
    const throttleUpdate = throttle(() => updateLiveData(), 30)
    // data collection
    // interval add data entry
    const addRow = (values?: number[]) => {
        if (!liveDataSet) return;
        //console.log(values)
        liveDataSet.addRow(values)
        if (recording && liveDataSet.length >= samplingCount) {
            // stop recording
            updateLiveData()
            stopRecording()
        } else {
            throttleUpdate()
        }
    }
    // setting interval
    useEffect(() => {
        if (error) return;
        console.log(`set interval to ${samplingIntervalDelayi}`)
        recordingRegisters.forEach(reg => reg.sendSetIntAsync(samplingIntervalDelayi));
    }, [samplingIntervalDelayi, registerIdsChecked, errorSamplingIntervalDelay])
    // collecting
    useEffect(() => {
        if (error || (aggregator && recording)) return undefined;
        const interval = setInterval(() => addRow(), samplingIntervalDelayi);
        const stopStreaming = startStreamingRegisters()
        return () => {
            clearInterval(interval);
            stopStreaming();
        }
    }, [recording, samplingIntervalDelayi, samplingCount, registerIdsChecked, aggregator]);
    useEffect(() => {
        if (aggregator) {
            const client = new SensorAggregatorClient(aggregator)
            return client.subscribeSample(values => addRow(values))
        }
        return () => { }
    }, [recording, liveDataSet, registerIdsChecked, aggregator])

    return (<div className={classes.root}>
        {!!aggregators.length && <div key="aggregators">
            <h3>(Optional) Choose a data aggregator</h3>
            <p>A <Link to="/services/aggregator">data aggregator</Link> service collects collects sensor data on the bus and returns an aggregated at regular intervals.</p>
            <Grid>
                {aggregators.map(aggregator => <Grid key={'aggregate' + aggregator.id} item xs={4}>
                    <Card>
                        <DeviceCardHeader device={aggregator.device} />
                        <CardActions>
                            <Switch checked={aggregatorId == aggregator.id} disabled={recording} onChange={handleAggregatorChecked(aggregator)} />
                        </CardActions>
                    </Card>
                </Grid>)}
            </Grid>
            {roleManager && <RoleManagerService service={roleManager} />}
        </div>}
        <div key="sensors">
            {connectionState == BusState.Disconnected && <p><ConnectButton /></p>}
            <h3>Choose sensors</h3>
            {!readingRegisters.length && <Alert className={classes.grow} severity="info">Waiting for sensor...</Alert>}
            {!!readingRegisters.length && <ReadingFieldGrid
                readingRegisters={readingRegisters}
                registerIdsChecked={registerIdsChecked}
                recording={recording}
                liveDataSet={liveDataSet}
                handleRegisterCheck={handleRegisterCheck}
            />}
        </div>
        <div key="record">
            <h3>Record data</h3>
            {aggregator && <p>Record the sensor input configuration in order to up your ML model later on.</p>}
            <div className={classes.buttons}>
                <Button
                    size="large"
                    variant="contained"
                    color={recording ? "secondary" : "primary"}
                    title="start/stop recording"
                    onClick={toggleRecording}
                    startIcon={recording ? <StopIcon /> : <PlayArrowIcon />}
                    disabled={!startEnabled}
                >{recording ? "Stop" : "Start"}</Button>
                {aggregator && <Button
                    variant="contained"
                    title="save sensor input configuration"
                    onClick={saveConfig}
                    startIcon={<SaveIcon />}
                    disabled={recording}>
                    Save configuration
                </Button>}
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
        { liveDataSet && <Trend key="trends" height={12} dataSet={liveDataSet} horizon={LIVE_HORIZON} dot={true} gradient={true} />}
        {
            !!tables.length && <div key="recordings">
                <h3>Recordings</h3>
                <DataSetGrid tables={tables} handleDeleteTable={handleDeleteTable} />
            </div>
        }
    </div >
    )

    //{liveDataSet && <DataSetTable key="datasettable" className={classes.segment} dataSet={liveDataSet} maxRows={3} minRows={3} />}

}
