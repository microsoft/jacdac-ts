import React from "react"
import IDChip from "./IDChip";
import { Link } from 'gatsby-theme-material-ui';
import { serviceSpecificationFromClassIdentifier } from "../../../src/dom/spec"
import ServiceSpecificationCard from "./ServiceSpecificationCard";
import { Grid } from "@material-ui/core";
import useGridBreakpoints from "./useGridBreakpoints";
import Markdown from "./Markdown";
import DeviceSpecificationSource from "./DeviceSpecificationSource";
import FirmwareCard from "./FirmwareCard"

export default function DeviceSpecification(props: { device: jdspec.DeviceSpec, showSource?: string }) {
    const { device, showSource } = props;
    const gridBreakpoints = useGridBreakpoints();

    return <>
        <h2 key="title">
            <Link to={device.link}>{device.name}</Link>
        </h2>
        {device.image && <img alt="image of the device" src={`https://raw.githubusercontent.com/microsoft/jacdac/main/devices/${device.image}`} />}
        {device.description && <Markdown source={device.description} />}
        {device.repo && <FirmwareCard slug={device.repo} />}
        {!!device.firmwares.length && <><h3>Firmware identifiers</h3>
            <ul>
                {device.firmwares.map(firmware => <li key={firmware}><IDChip id={firmware} filter={`fw:0x${firmware.toString(16)}`} /></li>)}
            </ul></>}
        <h3>Services</h3>
        <Grid container spacing={2}>
            {device.services.map(sc => serviceSpecificationFromClassIdentifier(sc))
                .map(spec => <Grid item key={spec.shortId} {...gridBreakpoints}>
                    <ServiceSpecificationCard specification={spec} />
                </Grid>)}
        </Grid>
        {showSource && <>
            <h2>Specification</h2>
            <DeviceSpecificationSource deviceSpecification={device} showMarkdown={true} />
        </>}
    </>
}
