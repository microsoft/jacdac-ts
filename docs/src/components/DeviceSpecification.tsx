import React from "react"
import IDChip from "./IDChip";
import { Link } from 'gatsby-theme-material-ui';
import ServiceSpecification from "./ServiceSpecification"
import { serviceSpecificationFromClassIdentifier } from "../../../src/dom/spec"

export default function DeviceSpecification(props: { device: jdspec.DeviceSpec }) {
    const { device } = props;
    return <>
        <h2 key="title">
            {device.name}
            <span style={{ marginLeft: "1rem" }}>
                {device.firmwares.map(firmware => <IDChip key={firmware} id={firmware} />)}
            </span>
        </h2>
        {device.image && <img key="image" alt="image of the device" src={`https://raw.githubusercontent.com/microsoft/jacdac/main/devices/${device.image}`} />}
        <p key="description">
            {device.description}
        </p>
        <ul>
            <li>repo: <Link to={device.repo}>{device.repo}</Link></li>
            <li>link: <Link to={device.link}>{device.link}</Link></li>
        </ul>
        <h3>Services</h3>
        <ul>
            {device.services.map(sc => serviceSpecificationFromClassIdentifier(sc))
                .map(spec => <li>
                    <Link to={`/services/${spec.shortId}`}>{spec.name}</Link>
                </li>)}
        </ul>
    </>
}
