import React, { useEffect, useState, useContext } from "react";
import { Button } from "gatsby-theme-material-ui";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { BusState } from "../../../src/dom/bus";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import UsbIcon from '@material-ui/icons/Usb';
import { useMediaQuery, useTheme } from "@material-ui/core";
import { DEVICE_CHANGE } from "../../../src/dom/constants";
import KindIcon from "../components/KindIcon";
import IconButtonWithProgress from "../components/IconButtonWithProgress"

export default function ConnectButton(props: { full?: boolean, className?: string, transparent?: boolean }) {
    const { full, className, transparent } = props
    const { bus, connectionState, connectAsync, disconnectAsync } = useContext<JDContextProps>(JACDACContext)
    const theme = useTheme()
    const [count, setCount] = useState(bus.devices().length)
    useEffect(() => bus.subscribe(DEVICE_CHANGE, () => setCount(bus.devices().length)))
    const showDisconnect = connectionState == BusState.Connected || connectionState == BusState.Disconnecting;
    const inProgress = connectionState == BusState.Connecting || connectionState == BusState.Disconnecting
    const small = !full && useMediaQuery(theme.breakpoints.down("md"))
    const disabled = connectionState != BusState.Connected && connectionState != BusState.Disconnected
    const onClick = showDisconnect ? disconnectAsync : connectAsync;
    const icon = showDisconnect ? <KindIcon kind="device" /> : <UsbIcon />
    const title = showDisconnect ? "disconnect" : "connect";

    if (small)
        return <span><IconButtonWithProgress
            size="small"
            title={title}
            color={transparent ? "inherit" : "primary"}
            className={className}
            disabled={disabled}
            indeterminate={inProgress}
            onClick={onClick}
            badgeCount={count}
        >
            {icon}
        </IconButtonWithProgress></span>
    else
        return <Button
            size="small"
            variant={transparent ? "outlined" : "contained"}
            color={transparent ? "inherit" : "primary"}
            className={className}
            startIcon={icon}
            disabled={disabled}
            onClick={onClick}>
            {title}
            {count > 0 && ` (${count})`}
        </Button>
}
