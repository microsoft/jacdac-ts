import { createStyles, Grid, makeStyles, Tab, Tabs, Theme } from "@material-ui/core";
import React, { useContext, useEffect, useState } from "react";
import { BusState } from "../../../src/dom/bus";
import { DEVICE_ANNOUNCE, DEVICE_CHANGE, FIRMWARE_BLOBS_CHANGE } from "../../../src/dom/constants";
import { isBootloaderFlashing, JDDevice } from "../../../src/dom/device";
import { scanFirmwares, updateApplicable } from "../../../src/dom/flashing";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import useEventRaised from "../jacdac/useEventRaised";
import TabPanel, { a11yProps } from './TabPanel';
import useGridBreakpoints from "./useGridBreakpoints";
import ConnectAlert from "./ConnectAlert";
import FirmwareCard from "./FirmwareCard";
import useSelectedNodes from "../jacdac/useSelectedNodes"
// tslint:disable-next-line: no-submodule-imports
import useFirmwareRepos from "./useFirmwareRepos";
import UpdateDeviceList from "./UpdateDeviceList";
import LocalFileFirmwareCard from "./LocalFileFirmwareCard";

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        blobs: {
            marginBottom: theme.spacing(2)
        }
    })
);

export default function Flash() {
    const { bus, connectionState } = useContext<JDContextProps>(JACDACContext)
    const gridBreakpoints = useGridBreakpoints()
    const [scanning, setScanning] = useState(false)
    const [tab, setTab] = useState(0);
    const classes = useStyles()
    const { hasSelection: isFlashing, selected: isDeviceFlashing, setSelected: setFlashing } = useSelectedNodes<JDDevice>()

    let devices = useEventRaised(DEVICE_CHANGE, bus, () => bus.devices().filter(dev => dev.announced))
    // filter out bootloader while flashing
    devices = devices.filter(dev => !isBootloaderFlashing(devices, isDeviceFlashing, dev))

    // collect firmware repoes
    const firmwareRepos = useFirmwareRepos()

    const blobs = useEventRaised(FIRMWARE_BLOBS_CHANGE, bus, () => bus.firmwareBlobs)
    async function scan() {
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
    useEffect(() => { scan() }, [isFlashing, connectionState])
    useEffect(() => bus.subscribe(DEVICE_ANNOUNCE, () => scan()), [bus])
    const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
        setTab(newValue);
    };
    const updates = devices.map(device => {
        return {
            firmware: device.firmwareInfo,
            device,
            blob: device.firmwareInfo && blobs?.find(b => device.firmwareInfo.firmwareIdentifier == b.firmwareIdentifier),
            flashing: isDeviceFlashing(device),
            setFlashing: (b: boolean) => setFlashing(device, b)
        }
    }).filter(update => !!update.firmware)
    return (
        <div className={classes.blobs}>
            <ConnectAlert />
            <Tabs value={tab} onChange={handleTabChange} aria-label="View specification formats">
                <Tab label={`Firmwares`} {...a11yProps(0)} />
                <Tab label={`Updates (${updates?.filter(up => updateApplicable(up.firmware, up.blob)).length || 0})`} {...a11yProps(1)} />
            </Tabs>
            <TabPanel value={tab} index={0}>
                <Grid container spacing={2}>
                    <Grid {...gridBreakpoints} item key="localfile">
                        <LocalFileFirmwareCard />
                    </Grid>
                    {firmwareRepos.map(firmwareRepo => <Grid {...gridBreakpoints} item key={`firmwarerepo${firmwareRepo}`}>
                        <FirmwareCard slug={firmwareRepo} />
                    </Grid>)}
                </Grid>
            </TabPanel>
            <TabPanel value={tab} index={1}>
                <UpdateDeviceList />
            </TabPanel>
        </div>
    )
}
