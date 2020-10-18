import { Button, Grid } from "@material-ui/core"
import { Alert } from "@material-ui/lab"
import React, { useContext, useState } from "react"
import { DEVICE_CHANGE, FIRMWARE_BLOBS_CHANGE } from "../../../src/dom/constants"
import { isBootloaderFlashing, JDDevice } from "../../../src/dom/device"
import { FirmwareBlob, FirmwareInfo, flashFirmwareBlob, updateApplicable } from "../../../src/dom/flashing"
import JACDACContext, { JDContextProps } from "../../../src/react/Context"
import useEventRaised from "../jacdac/useEventRaised"
import useSelectedNodes from "../jacdac/useSelectedNodes"
import CircularProgressWithLabel from "./CircularProgressWithLabel"
import DeviceCard from "./DeviceCard"
import useGridBreakpoints from "./useGridBreakpoints"

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
                ? <Button aria-label="deploy new firmware to device" disabled={flashing} variant="contained"
                    color="primary" onClick={() => handleFlashing()}>Flash</Button>
                : <Alert severity="success">Up to date!</Alert>} />
}

export default function UpdateDeviceList() {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const gridBreakpoints = useGridBreakpoints()
    const { hasSelection: isFlashing, selected: isDeviceFlashing, allSelected: allFlashing, setSelected: setFlashing } = 
        useSelectedNodes<JDDevice>()
    let devices = useEventRaised(DEVICE_CHANGE, bus, b => b.devices().filter(dev => dev.announced))
    // filter out bootloader while flashing
    devices = devices.filter(dev => !isBootloaderFlashing(devices, isDeviceFlashing, dev))
    const blobs = useEventRaised(FIRMWARE_BLOBS_CHANGE, bus, () => bus.firmwareBlobs)
    const updates = devices.map(device => {
        return {
            firmware: device.firmwareInfo,
            device,
            blob: device.firmwareInfo && blobs?.find(b => device.firmwareInfo.deviceClass == b.deviceClass),
            flashing: isDeviceFlashing(device),
            setFlashing: (b: boolean) => setFlashing(device, b)
        }
    }).filter(update => !!update.firmware)

    return <Grid container spacing={2}>
        {updates
            .map(update => <Grid key={"fw" + update.device.id} item {...gridBreakpoints}>
                <UpdateDeviceCard {...update} />
            </Grid>)}
    </Grid>

}