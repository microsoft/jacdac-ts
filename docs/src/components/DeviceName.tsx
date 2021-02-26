import { Typography } from "@material-ui/core";
import React from "react"
import { JDDevice } from "../../../src/jdom/device";
import useDeviceName from "./useDeviceName";

export default function DeviceName(props: {
    device: JDDevice,
    serviceIndex?: number,
    expanded?: boolean,
    showShortId?: boolean
}) {
    const { device, serviceIndex, showShortId } = props
    const name = useDeviceName(device)
    const { shortId } = device

    return <span>
        {name || (showShortId && shortId)}
        {showShortId && name && name !== shortId &&
            <Typography component="span" variant="body2"> {shortId}</Typography>}
        {serviceIndex !== undefined && `[${serviceIndex}]`}
    </span>
}