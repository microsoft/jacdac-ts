
import React, { useState, useContext, useEffect } from 'react';
import { List } from '@material-ui/core';
import JacdacContext from "./Context";
import DeviceListItem from './DeviceListItem';
import { Device } from "../../../src/device";

const DeviceList = () => {
    const ctx = useContext(JacdacContext);
    const [devices, setDevices] = useState<Device[]>(ctx.bus.devices());
    useEffect(() => {
        console.log("devicelist useeffect")
        const update = () => setDevices(ctx.bus.devices());
        ctx.bus.on("deviceannouce", update)
        return () => ctx.bus.off("deviceannouce", update);
    });
    useEffect(() => {
        console.log("devicelist useeffect")
        const update = () => setDevices(ctx.bus.devices());
        ctx.bus.on("devicedisconnect", update)
        return () => ctx.bus.off("devicedisconnect", update);
    });

    return <List component="nav" aria-label="devices">
        {devices.map(device => <DeviceListItem device={device} />)}
    </List>
}

export default DeviceList