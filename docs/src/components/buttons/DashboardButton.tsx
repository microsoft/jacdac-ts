import { Badge } from "@material-ui/core";
import React, {  } from "react";
import JacdacIcon from "../icons/JacdacIcon";
import IconButtonWithTooltip from "../ui/IconButtonWithTooltip";
import useDeviceCount from "../hooks/useDeviceCount"

export default function DashboardButton(props: { className?: string }) {
    const { className } = props;
    const count = useDeviceCount()

    return <IconButtonWithTooltip className={className} aria-label="Dashboard" title="Dashboard"
        edge="start" color="inherit" to="/dashboard/" >
        <Badge color="secondary" badgeContent={count}>
            <JacdacIcon />
        </Badge>
    </IconButtonWithTooltip>
}