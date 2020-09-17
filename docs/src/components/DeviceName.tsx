import { Typography } from "@material-ui/core";
import React from "react"
import { JDDevice } from "../../../src/dom/device";
import useDeviceName from "./useDeviceName";

export default function DeviceName(props: { device: JDDevice }) {
    const { device } = props
    const name = useDeviceName(device)
    const { shortId } = device

    return <span>
        {name || shortId}
        {name && name !== shortId &&
            <Typography component="span" variant="body2"> {shortId}</Typography>}
    </span>
}