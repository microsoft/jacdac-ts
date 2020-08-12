import React, { useState, useContext, useEffect } from 'react';
// tslint:disable-next-line: no-submodule-imports
import { makeStyles, Theme } from '@material-ui/core/styles';
// tslint:disable-next-line: no-submodule-imports
import Tabs from '@material-ui/core/Tabs';
// tslint:disable-next-line: no-submodule-imports
import Tab from '@material-ui/core/Tab';
import { Paper, Grid, ButtonGroup, Button, ListItem, List, ListItemText, ListItemSecondaryAction, TextField, InputAdornment } from '@material-ui/core';
import TabPanel, { a11yProps } from './TabPanel';
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

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        flexGrow: 1,
        backgroundColor: theme.palette.background.paper,
        marginBottom: theme.spacing(1)
    },
    pre: {
        margin: "0",
        padding: "0",
        backgroundColor: "transparent",
        whiteSpec: "pre-wrap"
    }
}));

interface Table {
    id: number;
    name: string;
    headers: string[];
    rows: number[][];
}

export default function Collector(props: {}) {
    const { } = props;
    const { bus } = useContext(JacdacContext)
    const classes = useStyles();
    const [tab, setTab] = useState(0);
    const [expanded, setExpanded] = useState<string[]>([])
    const [checked, setChecked] = useState<string[]>([])
    const [recording, setRecording] = useState(false)
    const [tables, setTables] = useState<Table[]>([])
    const [recordingLength, setRecordingLength] = useState(0)
    const [prefix, setPrefix] = useState("data")
    const [samplingIntervalDelay, setSamplingIntervalDelay] = useState("100")
    const registers = checked.map(id => bus.node(id) as JDRegister)
    const error = isNaN(parseInt(samplingIntervalDelay)) || !/\d+/.test(samplingIntervalDelay)

    const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => setTab(newValue);
    const handleToggle = (ids) => setExpanded(ids)
    const handleCheck = (ids) => setChecked(ids)
    const handleRecording = () => {
        if (recording) {
            // finalize recording
            setRecording(false)
        } else {
            tables.unshift({
                id: Math.random(),
                name: `${prefix}${tables.length}`,
                headers: ["timestamp"].concat(registers.map(register => register.id)),
                rows: []
            })
            setTables(tables)
            setRecording(true)
        }
    }
    const handleSamplingIntervalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSamplingIntervalDelay(event.target.value.trim())
    }
    useEffect(() => {
        if (error) return undefined;
        const delay = parseInt(samplingIntervalDelay)
        const interval = setInterval(() => {
            if (!recording) return; // already done

            const row: number[] = [bus.timestamp];
            registers.forEach(register => {
                const values = register.numValues;
                values.forEach(value => row.push(value))
            })
            tables[0].rows.push(row)
            setTables(tables);
            setRecordingLength(tables[0].rows.length)
        }, delay);

        return () => clearInterval(interval);
    }, [recording, samplingIntervalDelay, checked]);

    return (
        <div className={classes.root}>
            <Paper square>
                <Tabs value={tab} onChange={handleTabChange} aria-label="Configure data source, record data">
                    <Tab label="Data Sources" {...a11yProps(0)} />
                    <Tab label="Recorder" {...a11yProps(1)} />
                </Tabs>
                <TabPanel value={tab} index={0}>
                    <DomTreeView
                        checkboxes={["register"]}
                        serviceFilter={srv => !!srv.readingRegister}
                        eventFilter={ev => false}
                        registerFilter={reg => reg.isReading}
                        defaultExpanded={expanded}
                        defaultChecked={checked}
                        onToggle={handleToggle}
                        onChecked={handleCheck}
                    />
                </TabPanel>
                <TabPanel value={tab} index={1}>
                    <Grid container
                        spacing={2}>
                        {registers.map(register =>
                            <Grid item key={register.id}>
                                <RegisterInput register={register} showDeviceName={true} showName={true} />
                            </Grid>)}
                    </Grid>
                    <ButtonGroup>
                        <Button
                            title="start/stop recording"
                            onClick={handleRecording}
                            startIcon={recording ? <StopIcon /> : <PlayArrowIcon />}
                            disabled={!registers?.length}
                        >{recording ? "Stop" : "Start"}</Button>
                    </ButtonGroup>
                    <TextField error={error}
                        label="Sampling interval"
                        value={samplingIntervalDelay}
                        InputProps={{
                            startAdornment: <InputAdornment position="start">ms</InputAdornment>,
                        }}
                        onChange={handleSamplingIntervalChange} />
                    <List>
                        {tables.map((table, index) => <ListItem key={table.id}>
                            <ListItemText primary={table.name} secondary={`${(recording && !index) ? recordingLength : table.rows.length} rows`} />
                            <ListItemSecondaryAction>
                                {(!recording || !!index) && !!table.rows.length && <IconButton>
                                    <SaveAltIcon />
                                </IconButton>}
                            </ListItemSecondaryAction>
                        </ListItem>)}
                    </List>
                </TabPanel>
            </Paper>
        </div>
    );
}
