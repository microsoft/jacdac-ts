import { Box, Tab, Tabs } from "@material-ui/core";
import React, { useState } from "react";
import TabPanel, { a11yProps } from '../ui/TabPanel';
import ConnectAlert from "../ConnectAlert";
import FirmwareCardGrid from "../firmware/FirmwareCardGrid";
// tslint:disable-next-line: no-submodule-imports
import UpdateDeviceList from "../UpdateDeviceList";
export default function Flash() {
    const [tab, setTab] = useState(0);
    const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
        setTab(newValue);
    };
    return (
        <Box mb={2}>
            <ConnectAlert />
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
