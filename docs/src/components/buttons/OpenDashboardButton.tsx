import { Badge } from "@material-ui/core";
import React, { useContext, useEffect, useState } from "react";
import JacdacIcon from "../icons/JacdacIcon";
import IconButtonWithTooltip from "../ui/IconButtonWithTooltip";
import useDeviceCount from "../hooks/useDeviceCount"
import JACDACContext, { JDContextProps } from "../../../../src/react/Context";
import { DEVICE_ANNOUNCE, DEVICE_DISCONNECT } from "../../../../src/jdom/constants";
import { JDDevice } from "../../../../src/jdom/device";


export default function OpenDashboardButton(props: { className?: string }) {
    const { className } = props;
    const count = useDeviceCount({ ignoreSelf: true })

    return <IconButtonWithTooltip className={className} title="Device Dashboard"
        edge="start" color="inherit" to="/dashboard/">
        <Badge color="secondary" badgeContent={count}>
            <JacdacIcon />
        </Badge>
    </IconButtonWithTooltip>
}