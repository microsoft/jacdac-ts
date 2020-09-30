import React from "react"
import IDChip from "./IDChip";
import { Link } from 'gatsby-theme-material-ui';
import { serviceSpecificationFromClassIdentifier } from "../../../src/dom/spec"
import ServiceSpecificationCard from "./ServiceSpecificationCard";
import { Grid } from "@material-ui/core";
import useGridBreakpoints from "./useGridBreakpoints";
import Markdown from "./Markdown";
import DeviceSpecificationSource from "./DeviceSpecificationSource";

export default function DeviceSpecification(props: { device: jdspec.DeviceSpec, showSource?: string }) {
    const { device, showSource } = props;
    const gridBreakpoints = useGridBreakpoints();

    return <>
        <h2 key="title">
            {device.name}
            <span style={{ marginLeft: "1rem" }}>
                {device.firmwares.map(firmware => <IDChip key={firmware} id={firmware} />)}
            </span>
        </h2>
        {device.image && <img key="image" alt="image of the device" src={`https://raw.githubusercontent.com/microsoft/jacdac/main/devices/${device.image}`} />}
        <p key="description">
            {device.description && <Markdown source={device.description} />}
        </p>
        <ul>
            <li>repo: <Link to={device.repo}>{device.repo}</Link></li>
            <li>link: <Link to={device.link}>{device.link}</Link></li>
        </ul>
        {!!device.firmwares.length && <><h3>Firmware identifiers</h3>
            <ul>
                {device.firmwares.map(fw => <li key={fw}>0x{fw.toString(16)}</li>)}
            </ul></>}
        <h3>Services</h3>
        <Grid container spacing={2}>
            {device.services.map(sc => serviceSpecificationFromClassIdentifier(sc))
                .map(spec => <Grid item {...gridBreakpoints}>
                    <ServiceSpecificationCard key={spec.shortId} specification={spec} />
                </Grid>)}
        </Grid>
        {showSource && <>
            <h2>Specification</h2>
            <DeviceSpecificationSource deviceSpecification={device} showMarkdown={true} />
        </>}
    </>
}
