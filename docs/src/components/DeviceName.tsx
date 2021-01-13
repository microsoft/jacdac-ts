import { Typography, useMediaQuery, useTheme } from "@material-ui/core";
import React from "react"
import { JDDevice } from "../../../src/jdom/device";
import useDeviceHost from "./hooks/useDeviceHost";
import useDeviceName from "./useDeviceName";

export default function DeviceName(props: {
    device: JDDevice,
    serviceIndex?: number,
    expanded?: boolean,
    showShortId?: boolean
}) {
    const { device, serviceIndex, showShortId, expanded } = props
    const name = useDeviceName(device)
    const { shortId } = device
    const theme = useTheme();
    const mobile = useMediaQuery(theme.breakpoints.down("sm"));
    const host = useDeviceHost(device)

    return <span>
        {name || shortId}
        {showShortId && name && name !== shortId &&
            <Typography component="span" variant="body2"> {shortId}</Typography>}
        {serviceIndex !== undefined && `[${serviceIndex}]`}
        {host && (expanded || !mobile) && <Typography component="span" variant="caption">(virtual)</Typography>}
    </span>
}