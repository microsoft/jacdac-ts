import { Typography } from "@material-ui/core";
import React from "react"
import { JDDevice } from "../../../src/jdom/device";
import useDeviceHost from "./hooks/useDeviceHost";
import useDeviceName from "./useDeviceName";

export default function DeviceName(props: { device: JDDevice, serviceIndex?: number, 
    showShortId?: boolean }) {
    const { device, serviceIndex, showShortId } = props
    const name = useDeviceName(device)
    const { shortId } = device
    const host = useDeviceHost(device)

    return <span>
        {name || shortId}
        {showShortId && name && name !== shortId &&
            <Typography component="span" variant="body2"> {shortId}</Typography>}
        {serviceIndex !== undefined && `[${serviceIndex}]`}
        {host && <Typography component="span" variant="caption">(virtual)</Typography>}
    </span>
}