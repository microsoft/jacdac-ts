
import React, { useState, useContext, useEffect, useMemo } from 'react';
import { List, ListItem, ListItemText, GridList } from '@material-ui/core';
import DeviceListItem from './DeviceListItem';
import { Device } from "../../../src/dom/device";
import { useQuery } from '../jacdac/useQuery';
import JacdacContext from "../../../src/react/Context";
import { BusState } from '../../../src/dom/bus';
import { DEVICE_CHANGE } from '../../../src/dom/constants';
import useChange from '../jacdac/useChange';

const DeviceList = () => {
    const { bus, connectionState } = useContext(JacdacContext)
    const devices = useChange(bus, e => e.devices());
    console.log(devices)
    return (
        <GridList aria-label="devices">
            {connectionState == BusState.Connected && !devices.length && <ListItem><ListItemText primary="No device detected..." /></ListItem>}
            {devices.map(device => <DeviceListItem device={device} />)}
            {connectionState == BusState.Disconnected && <ListItem><ListItemText primary="Connect to see devices" /></ListItem>}
        </GridList>
    )

}

export default DeviceList