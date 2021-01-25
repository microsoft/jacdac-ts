import { Badge } from "@material-ui/core";
import React, { useContext, useEffect, useState } from "react";
import JacdacIcon from "../icons/JacdacIcon";
import IconButtonWithTooltip from "../ui/IconButtonWithTooltip";
import useDeviceCount from "../hooks/useDeviceCount"
import JACDACContext, { JDContextProps } from "../../../../src/react/Context";
import { DEVICE_ANNOUNCE, DEVICE_DISCONNECT } from "../../../../src/jdom/constants";
import { JDDevice } from "../../../../src/jdom/device";

function AriaLiveUpdates() {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const [live, setLive] = useState("");

    // announce new devices
    useEffect(() => bus.subscribe(DEVICE_ANNOUNCE, (device: JDDevice) => {
        setLive(`${device.friendlyName} connected`)
    }), [])

    // announce disconnected devices
    useEffect(() => bus.subscribe(DEVICE_DISCONNECT, (device: JDDevice) => {
        setLive(`${device.friendlyName} disconnected`)
    }), [])

    if (!live)
        return null;

        console.log({ live })
    // invisible tag
    return <span id="liveannounce"
        role="alert"
        style={{ display: "none" }}
        aria-label={live}
        aria-live="assertive">
        {live}
    </span>
}

export default function OpenDashboardButton(props: { className?: string }) {
    const { className } = props;
    const count = useDeviceCount({ ignoreSelf: true })

    return <IconButtonWithTooltip className={className} title="Device Dashboard"
        edge="start" color="inherit" to="/dashboard/">
        <Badge color="secondary" badgeContent={count}>
            <JacdacIcon />
        </Badge>
        <AriaLiveUpdates />
    </IconButtonWithTooltip>
}