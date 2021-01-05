import { Box, Switch, Tab, Tabs } from "@material-ui/core";
import React, { useContext, useEffect, useState } from "react";
import TabPanel, { a11yProps } from '../ui/TabPanel';
import ConnectAlert from "../alert/ConnectAlert";
import FirmwareCardGrid from "../firmware/FirmwareCardGrid";
// tslint:disable-next-line: no-submodule-imports
import UpdateDeviceList from "../UpdateDeviceList";
import JACDACContext, { JDContextProps } from "../../../../src/react/Context";
export default function Flash() {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const [tab, setTab] = useState(0);
    const [safeBoot, setSafeBoot] = useState(false);
    const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
        setTab(newValue);
    }

    // turn on and off safeboot mode
    useEffect(() => {
        bus.safeBoot = safeBoot;
        return () => { bus.safeBoot = false }
    }, [safeBoot]);

    return (
        <Box mb={2}>
            <ConnectAlert />
            <div>
                <Switch value={safeBoot} onChange={() => setSafeBoot(!safeBoot)} />
                recovery: keep modules in bootloader mode after reset
            </div>
            <Tabs value={tab} onChange={handleTabChange} aria-label="View specification formats">
                <Tab label={`Firmwares`} {...a11yProps(0)} />
                <Tab label={`Updates`} {...a11yProps(1)} />
            </Tabs>
            <TabPanel value={tab} index={0}>
                <FirmwareCardGrid />
            </TabPanel>
            <TabPanel value={tab} index={1}>
                <UpdateDeviceList />
            </TabPanel>
        </Box>
    )
}
