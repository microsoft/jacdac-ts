import React, { useState, useContext, useEffect } from 'react';
// tslint:disable-next-line: no-submodule-imports
import { makeStyles, Theme } from '@material-ui/core/styles';
// tslint:disable-next-line: no-submodule-imports
import Tabs from '@material-ui/core/Tabs';
// tslint:disable-next-line: no-submodule-imports
import Tab from '@material-ui/core/Tab';
import { Paper, Grid, ButtonGroup, Button, ListItem, List, ListItemText, ListItemSecondaryAction, TextField, InputAdornment, createStyles, FormControl, ListSubheader, Switch, Card, CardActions, CardHeader, CardContent, Stepper, Step, StepLabel, StepContent, StepButton } from '@material-ui/core';
import DomTreeView from './DomTreeView';
import { JDRegister } from '../../../src/dom/register';
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
import { SensorReg } from '../../../jacdac-spec/dist/specconstants';
import { prettyDuration } from '../../../src/dom/pretty'
import useChange from '../jacdac/useChange';
import { setStreamingAsync } from '../../../src/dom/sensor';
import { DataSet } from './DataSet';
import Trend from './Trend';
// tslint:disable-next-line: no-submodule-imports
import Alert from '@material-ui/lab/Alert';

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
        marginTop: theme.spacing(2)
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
    const url = `data:text/plain;charset=utf-8,${encodeURI(csv.join('\n'))}`
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

export default function Collector(props: {}) {
    const { } = props;
    const { bus } = useContext(JacdacContext)
    const classes = useStyles();
    const [checked, setChecked] = useState<string[]>([])
    const [recording, setRecording] = useState(false)
    const [tables, setTables] = useState<DataSet[]>([])
    const [recordingLength, setRecordingLength] = useState(0)
    const [prefix, setPrefix] = useState("data")
    const [samplingIntervalDelay, setSamplingIntervalDelay] = useState("100")
    const readingRegisters = useChange(bus, bus =>
        bus.devices().map(device => device
            .services().find(srv => srv.readingRegister)
            ?.readingRegister
        ).filter(reg => !!reg))
    const recordingRegisters = readingRegisters.filter(reg => checked.indexOf(reg.id) > -1)
    const samplingIntervalDelayi = parseInt(samplingIntervalDelay)
    const error = isNaN(samplingIntervalDelayi) || !/\d+/.test(samplingIntervalDelay)

    const handleCheck = (register: JDRegister) => () => {
        const i = checked.indexOf(register.id)
        if (i > -1) {
            checked.splice(i, 1)
            setStreamingAsync(register.service, false)
        }
        else {
            checked.push(register.id)
            setStreamingAsync(register.service, true)
            register.sendGetAsync() // at least some data
        }
        setChecked([...checked])
    }
    const handleRecording = () => {
        if (recording) {
            // finalize recording
            setRecording(false)
        } else {
            const headers = []
            let units = []
            recordingRegisters.forEach(register => {
                const fields = register.specification.fields
                units = units.concat(fields.map(field => field.unit))
                if (fields.length == 1 && fields[0].name == "_") {
                    headers.push(`${register.service.device.name}/${register.specification.name}`)
                }
                else
                    fields.forEach(field => headers.push(`${register.service.device.name}/${field.name}`))
            })
            const colors = headers.map((_, index) => palette[index % palette.length])
            const newTable = new DataSet(`${prefix || "data"}${tables.length}`,
                colors,
                headers,
                units)
            setTables([newTable, ...tables])
            setRecording(true)
        }
    }
    const handleSamplingIntervalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSamplingIntervalDelay(event.target.value.trim())
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

    // data collection
    // interval add data entry
    const addRow = () => {
        if (!recording) return; // already done

        const table = tables[0]
        const row: number[] = [];
        recordingRegisters.forEach(register => {
            const values = register.values;
            if (values)
                values.forEach(value => row.push(value))
            else { // no data yet
                const fields = register.specification.fields
                fields.forEach(() => row.push(undefined))
            }

        })
        table.addExample(bus.timestamp, row)
        setTables(tables);
        setRecordingLength(table.rows.length)
    }
    // setting interval
    useEffect(() => {
        if (!error)
            recordingRegisters.forEach(register => register.service
                .register(SensorReg.StreamingInterval)
                .sendSetIntAsync(samplingIntervalDelayi)
            )
    }, [samplingIntervalDelayi, checked, error])
    // collecting
    useEffect(() => {
        if (error) return undefined;
        const interval = setInterval(() => addRow(), samplingIntervalDelayi);
        return () => clearInterval(interval);
    }, [recording, samplingIntervalDelayi, checked]);

    const sources = <Grid container spacing={2}>
        {!readingRegisters.length && <Alert className={classes.grow} severity="info">Waiting for sensor. Did you connect your device?</Alert>}
        {readingRegisters.map(register =>
            <Grid item xs={4} key={'source' + register.id}>
                <Card>
                    <CardHeader>
                        {register.service.name}
                    </CardHeader>
                    <CardContent>
                        {`${register.service.device.name}/${register.name}`}
                    </CardContent>
                    <CardActions>
                        <Switch
                            onChange={handleCheck(register)}
                            checked={checked.indexOf(register.id) > -1}
                        />
                    </CardActions>
                </Card>
            </Grid>)}
    </Grid>


    return (<div className={classes.root}>
        <div>
            <h3>Choose sensors</h3>
            {sources}
        </div>
        <div>
            <h3>Record data</h3>
            <div className={classes.buttons}>
                <Button
                    size="large"
                    variant="contained"
                    color="primary"
                    title="start/stop recording"
                    onClick={handleRecording}
                    startIcon={recording ? <StopIcon /> : <PlayArrowIcon />}
                    disabled={!recordingRegisters?.length}
                >{recording ? "Stop" : "Start"}</Button>
            </div>
            <div className={classes.row}>
                <TextField
                    className={classes.field}
                    error={error}
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
                    disabled={recording}
                    label="File name prefix"
                    value={prefix}
                    variant="outlined"
                    onChange={handlePrefixChange} />
            </div>
        </div>
        {tables[0] && <Trend height={12} dataSet={tables[0]} horizon={20} dot={true} gradient={true} />}
        {!!tables.length && <div>
            <List dense>
                {tables.map((table, index) =>
                    <ListItem key={`result` + table.id}>
                        <ListItemText primary={table.name} secondary={
                            <React.Fragment>
                                {`${(recording && !index) ? recordingLength : table.rows.length} rows`}
                                {`, ${prettyDuration(table.duration)}`}
                                {(!recording || index) && <Trend dataSet={table} height={8} mini={true} />}
                            </React.Fragment>
                        } />
                        <ListItemSecondaryAction>
                            {(!recording || !!index) && !!table.rows.length && <IconButton onClick={handleDownload(table)}>
                                <SaveAltIcon />
                            </IconButton>}
                            {(!recording || !!index) && <IconButton onClick={handleDeleteTable(table)}>
                                <DeleteIcon />
                            </IconButton>}
                        </ListItemSecondaryAction>
                    </ListItem>)}
            </List>
        </div>}
    </div >
    )
}
