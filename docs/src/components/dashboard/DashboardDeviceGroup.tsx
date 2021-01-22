import { Grid } from "@material-ui/core";
import React, { } from "react";
import { JDDevice } from "../../../../src/jdom/device";
import GridHeader from "../ui/GridHeader"
import DashbardDeviceItem from "./DashboardDeviceItem";

export default function DeviceGroup(props: {
    title: string,
    action?: JSX.Element,
    devices: JDDevice[],
    expanded: (device: JDDevice) => boolean,
    toggleExpanded: (device: JDDevice) => void,
    children?: JSX.Element | JSX.Element[]
}) {
    const { title, action, devices, expanded, toggleExpanded, children } = props;
    const handleExpand = (device: JDDevice) => () => toggleExpanded(device)
    return <section>
        <Grid container spacing={2}>
            <GridHeader title={title} action={action} />
            {devices?.map(device => <DashbardDeviceItem
                key={device.id}
                device={device}
                expanded={expanded(device)}
                toggleExpanded={handleExpand(device)} />)}
            {children}
        </Grid>
    </section>
}
