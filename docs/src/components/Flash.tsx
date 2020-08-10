import { parseUF2, FirmwareInfo, scanFirmwares, FirmwareBlob, updateApplicable, flashFirmwareBlob } from "../../../src/dom/flashing"
import React, { useState, useContext, Fragment, useEffect } from "react"
import JacdacContext from "../../../src/react/Context"
import { ListItem, List, Typography, LinearProgress, Box, LinearProgressProps, Grid, makeStyles, Paper, Theme, createStyles, Chip } from "@material-ui/core";
import DeviceCard from "./DeviceCard";
import { Button } from "gatsby-theme-material-ui";
import { BusState } from "../../../src/dom/bus";
import UploadButton from "./UploadButton";
import IDChip from "./IDChip";
import { JDDevice } from "../../../src/dom/device";
import { useDbFile, useFirmwareBlobs } from "./DbContext";
import { DEVICE_DISCONNECT, DEVICE_ANNOUNCE } from "../../../src/dom/constants";

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
    const { blobs, setFile } = useFirmwareBlobs()
    const [fws, setFws] = useState<FirmwareInfo[]>(undefined)
    const [importing, setImporting] = useState(false)
    const [flashing, setFlashing] = useState(0)
    const [scanning, setScanning] = useState(false)
    const classes = useStyles()
    const { file: firmwareFile, setFile: setFirmwareFile } = useDbFile("firmware.uf2")

    async function scan() {
        if (flashing > 0 || scanning || connectionState != BusState.Connected)
            return;
        try {
            setScanning(true)
            const fws = await scanFirmwares(bus)
            setFws(fws)
        }
        finally {
            setScanning(false)
        }
    }
    // load indexed db file once
    useEffect(() => { scan() }, [flashing])
    useEffect(bus.subscribe([DEVICE_ANNOUNCE, DEVICE_DISCONNECT], () => scan()))
    const handleFiles = async (files: FileList) => {
        const file = files.item(0)
        if (file) {
            try {
                setImporting(true)
                // try loading
                await setFile(file)
            } finally {
                setImporting(false)
            }

            // scan again
            await scan()
        }
    }
    const updates = fws?.map(fw => {
        return {
            firmware: fw,
            device: bus.device(fw.deviceId),
            blob: blobs?.find(b => fw.deviceClass == b.deviceClass),
            setFlashing: (b: boolean) => {
                setFlashing(flashing + (b ? 1 : -1))
            }
        }
    }).filter(fw => !!fw.blob && !!fw.device);

    return (
        <Fragment>
            {importing && <LinearProgress variant="indeterminate" />}
            {!blobs && !importing && <UploadButton text={"Import UF2 firmware"} onFilesUploaded={handleFiles} />}
            {blobs && <Paper className={classes.blobs}><List>
                {blobs.map(blob => <ListItem key={`blob${blob.deviceClass}`}>
                    <span>{blob.name}</span> <Chip size="small" label={blob.version} /> <IDChip id={blob.deviceClass} />
                </ListItem>)}
            </List></Paper>}
            {updates && <Grid container spacing={2}>
                {updates
                    .map(update => <Grid key={"fw" + update.device.id} item xs={4}>
                        <UpdateDeviceCard {...update} />
                    </Grid>)}
            </Grid>}
        </Fragment>
    )
}
