import { parseUF2, FirmwareInfo, scanFirmwares, FirmwareBlob, updateApplicable, flashFirmwareBlob } from "../../../src/dom/flashing"
import React, { useState, useContext, Fragment, useEffect } from "react"
import JacdacContext from "../../../src/react/Context"
import { ListItem, List, Typography, LinearProgress, Box, LinearProgressProps, Grid, makeStyles, Paper, Theme, createStyles, Chip, Tabs, Tab } from "@material-ui/core";
import DeviceCard from "./DeviceCard";
import { Button } from "gatsby-theme-material-ui";
import { BusState } from "../../../src/dom/bus";
import UploadButton from "./UploadButton";
import IDChip from "./IDChip";
import { JDDevice } from "../../../src/dom/device";
import { useFirmwareBlobs } from "./DbContext";
import { DEVICE_ANNOUNCE, FIRMWARE_BLOBS_CHANGE, DEVICE_CHANGE } from "../../../src/dom/constants";
import useEventRaised from "../jacdac/useEventRaised";
import TabPanel, { a11yProps } from './TabPanel';

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        blobs: {
            marginBottom: theme.spacing(2)
        }
    })
);

function LinearProgressWithLabel(props: LinearProgressProps & { value: number }) {
    return (
        <Box display="flex" alignItems="center">
            <Box width="100%" mr={1}>
                <LinearProgress variant="determinate" {...props} />
            </Box>
            <Box minWidth={35}>
                <Typography variant="body2" color="textSecondary">{`${Math.round(
                    props.value,
                )}%`}</Typography>
            </Box>
        </Box>
    );
}

function UpdateDeviceCard(props: { device: JDDevice, firmware: FirmwareInfo, blob: FirmwareBlob, setFlashing: (b: boolean) => void }) {
    const { bus } = useContext(JacdacContext)
    const { device, firmware, blob, setFlashing: setParentFlashing } = props
    const [flashing, setFlashing] = useState(false)
    const [progress, setProgress] = useState(0)

    const handleFlashing = async () => {
        if (flashing) return;
        try {
            setProgress(0)
            setFlashing(true)
            setParentFlashing(true)
            blob.updateCandidates = [firmware]
            await flashFirmwareBlob(bus, blob, prog => setProgress(prog))
        } catch (e) {
        } finally {
            setFlashing(false)
            setParentFlashing(false)
        }
    }

    return <DeviceCard device={device}
        showFirmware={true}
        content={<Typography>
            {firmware.name}
        </Typography>}
        // tslint:disable-next-line: react-this-binding-issue
        action={flashing ? <LinearProgressWithLabel value={progress} />
            : updateApplicable(firmware, blob)
                ? <Button disabled={flashing} variant="contained"
                    color="primary" onClick={() => handleFlashing()}>Flash</Button>
                : <span>Up to date!</span>} />
}

export default function Flash() {
    const { bus, connectionState } = useContext(JacdacContext)
    const { setFirmwareFile } = useFirmwareBlobs()
    const [importing, setImporting] = useState(false)
    const [flashing, setFlashing] = useState(0)
    const [scanning, setScanning] = useState(false)
    const [tab, setTab] = useState(0);
    const classes = useStyles()

    const devices = useEventRaised(DEVICE_CHANGE, bus, () => bus.devices())
    const blobs = useEventRaised(FIRMWARE_BLOBS_CHANGE, bus, () => bus.firmwareBlobs)
    async function scan() {
        if (flashing > 0 || scanning || connectionState != BusState.Connected)
            return;
        try {
            setScanning(true)
            await scanFirmwares(bus)
        }
        finally {
            setScanning(false)
        }
    }
    // load indexed db file once
    useEffect(() => { scan() }, [flashing])
    useEffect(bus.subscribe(DEVICE_ANNOUNCE, () => scan()))
    const handleFiles = async (files: FileList) => {
        const file = files.item(0)
        if (file) {
            try {
                setImporting(true)
                await setFirmwareFile(file)
            } finally {
                setImporting(false)
            }
        }
    }
    const handleClear = async () => {
        try {
            setImporting(true)
            await setFirmwareFile(undefined)
        } finally {
            setImporting(false)
        }
    }
    const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
        setTab(newValue);
    };
    const updates = devices.map(device => {
        return {
            firmware: device.firmwareInfo,
            device,
            blob: device.firmwareInfo && blobs?.find(b => device.firmwareInfo.deviceClass == b.deviceClass),
            setFlashing: (b: boolean) => {
                setFlashing(flashing + (b ? 1 : -1))
            }
        }
    }).filter(fw => !!fw.firmware && !!fw.blob && !!fw.device);

    return (
        <Paper className={classes.blobs}>
            <Tabs value={tab} onChange={handleTabChange} aria-label="View specification formats">
                <Tab label={`Firmware (${blobs?.length || 0})`} {...a11yProps(0)} />
                <Tab label={`Updates (${updates?.filter(up => updateApplicable(up.firmware, up.blob)).length || 0})`} {...a11yProps(1)} />
            </Tabs>
            <TabPanel value={tab} index={0}>
                <List>
                    <ListItem key="importbtn">
                        {importing && <LinearProgress variant="indeterminate" />}
                        {!importing && <UploadButton text={"Import UF2 firmware"} onFilesUploaded={handleFiles} />}
                        {!importing && <Button aria-label={"Clear UF2 firmware"} onClick={handleClear}>clear</Button>}
                    </ListItem>
                    {blobs?.map(blob => <ListItem key={`blob${blob.deviceClass}`}>
                        <span>{blob.name}</span> <Chip size="small" label={blob.version} /> <IDChip id={blob.deviceClass} />
                    </ListItem>)}
                </List>
            </TabPanel>
            <TabPanel value={tab} index={1}>
                {updates && <Grid container spacing={2}>
                    {updates
                        .map(update => <Grid key={"fw" + update.device.id} item xs={4}>
                            <UpdateDeviceCard {...update} />
                        </Grid>)}
                </Grid>}
            </TabPanel>
        </Paper>
    )
}
