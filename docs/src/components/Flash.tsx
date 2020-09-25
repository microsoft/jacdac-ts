import { Chip, createStyles, Grid, LinearProgress, List, ListItem, makeStyles, Paper, Tab, Tabs, Theme, Typography } from "@material-ui/core";
import { Button } from "gatsby-theme-material-ui";
import React, { useContext, useEffect, useState } from "react";
import { BusState } from "../../../src/dom/bus";
import { DEVICE_ANNOUNCE, DEVICE_CHANGE, FIRMWARE_BLOBS_CHANGE, SRV_BOOTLOADER } from "../../../src/dom/constants";
import { isBootloaderFlashing, JDDevice } from "../../../src/dom/device";
import { FirmwareBlob, FirmwareInfo, flashFirmwareBlob, scanFirmwares, updateApplicable } from "../../../src/dom/flashing";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import useEventRaised from "../jacdac/useEventRaised";
import CircularProgressWithLabel from "./CircularProgressWithLabel";
import DeviceCard from "./DeviceCard";
import IDChip from "./IDChip";
import TabPanel, { a11yProps } from './TabPanel';
import UploadButton from "./UploadButton";
import useFirmwareBlobs from "./useFirmwareBlobs";
import useGridBreakpoints from "./useGridBreakpoints";
import ConnectAlert from "./ConnectAlert";
import FirmwareCard from "./FirmwareCard";
import useSelectedNodes from "../jacdac/useSelectedNodes"
// tslint:disable-next-line: no-submodule-imports
import Alert from "./Alert";

const firmwareRepos = [
    "microsoft/jacdac-stm32x0"
]

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        blobs: {
            marginBottom: theme.spacing(2)
        }
    })
);

function UpdateDeviceCard(props: {
    device: JDDevice,
    firmware: FirmwareInfo,
    blob: FirmwareBlob,
    flashing: boolean,
    setFlashing: (b: boolean) => void
}) {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const { device, firmware, blob, flashing, setFlashing } = props
    const [progress, setProgress] = useState(0)

    const handleFlashing = async () => {
        if (flashing) return;
        console.log(`flash ${device}`)
        try {
            setProgress(0)
            setFlashing(true)
            const updateCandidates = [firmware]
            await flashFirmwareBlob(bus, blob, updateCandidates, prog => setProgress(prog))
        } catch (e) {
            console.error(e)
        } finally {
            console.log(`flashing ${device} done`)
            setFlashing(false)
        }
    }

    return <DeviceCard device={device}
        showFirmware={true}
        content={blob && <span>Update: {blob.version}</span>}
        // tslint:disable-next-line: react-this-binding-issue
        action={flashing ? <CircularProgressWithLabel value={progress} />
            : updateApplicable(firmware, blob)
                ? <Button disabled={flashing} variant="contained"
                    color="primary" onClick={() => handleFlashing()}>Flash</Button>
                : <Alert severity="success">Up to date!</Alert>} />
}

export default function Flash() {
    const { bus, connectionState } = useContext<JDContextProps>(JACDACContext)
    const gridBreakpoints = useGridBreakpoints()
    const { firmwareFileDependencyId, setFirmwareBlob } = useFirmwareBlobs()
    const [importing, setImporting] = useState(false)
    const [scanning, setScanning] = useState(false)
    const [tab, setTab] = useState(0);
    const classes = useStyles()
    const { hasSelection: isFlashing, selected: isDeviceFlashing, allSelected: allFlashing, setSelected: setFlashing } = useSelectedNodes<JDDevice>()

    let devices = useEventRaised(DEVICE_CHANGE, bus, () => bus.devices().filter(dev => dev.announced))
    // filter out bootloader while flashing
    devices = devices.filter(dev => !isBootloaderFlashing(devices, isDeviceFlashing, dev))
    const blobs = useEventRaised(FIRMWARE_BLOBS_CHANGE, bus, () => bus.firmwareBlobs)
    async function scan() {
        console.log(allFlashing)
        if (!blobs?.length || isFlashing || scanning || connectionState != BusState.Connected)
            return;
        console.log(`start scanning bus`)
        try {
            setScanning(true)
            await scanFirmwares(bus)
        }
        finally {
            setScanning(false)
        }
    }
    // load indexed db file once
    useEffect(() => { scan() }, [isFlashing, firmwareFileDependencyId, connectionState])
    useEffect(() => bus.subscribe(DEVICE_ANNOUNCE, () => scan()))
    const handleFiles = async (files: FileList) => {
        const file = files.item(0)
        if (file) {
            try {
                setImporting(true)
                await setFirmwareBlob(undefined, undefined, file)
            } finally {
                setImporting(false)
            }
        }
    }
    const handleClear = async () => {
        try {
            setImporting(true)
            await setFirmwareBlob(undefined, undefined, undefined)
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
            flashing: isDeviceFlashing(device),
            setFlashing: (b: boolean) => setFlashing(device, b)
        }
    }).filter(update => !!update.firmware)
    return (
        <div className={classes.blobs}>
            <ConnectAlert />
            <Tabs value={tab} onChange={handleTabChange} aria-label="View specification formats">
                <Tab label={`Firmware (${blobs?.length || 0})`} {...a11yProps(0)} />
                <Tab label={`Updates (${updates?.filter(up => updateApplicable(up.firmware, up.blob)).length || 0})`} {...a11yProps(1)} />
            </Tabs>
            <TabPanel value={tab} index={0}>
                <List>
                    {firmwareRepos.map(firmwareRepo => <ListItem key={`firmwarerepo${firmwareRepo}`}>
                        <FirmwareCard slug={firmwareRepo} />
                    </ListItem>)}
                    <ListItem key="importbtn">
                        {importing && <LinearProgress variant="indeterminate" />}
                        {!importing && <UploadButton text={"Import UF2 file"} onFilesUploaded={handleFiles} />}
                        {!importing && <Button variant="outlined" aria-label={"Clear firmwares"} onClick={handleClear}>clear</Button>}
                    </ListItem>
                    {blobs?.map(blob => <ListItem key={`blob${blob.deviceClass}`}>
                        <span>{blob.name}</span>&nbsp;<Chip size="small" label={blob.version} /> <IDChip id={blob.deviceClass} />
                    </ListItem>)}
                </List>
            </TabPanel>
            <TabPanel value={tab} index={1}>
                <Grid container spacing={2}>
                    {updates
                        .map(update => <Grid key={"fw" + update.device.id} item {...gridBreakpoints}>
                            <UpdateDeviceCard {...update} />
                        </Grid>)}
                </Grid>
            </TabPanel>
        </div>
    )
}
