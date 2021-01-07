import React, { useContext } from "react";
import { Button } from "gatsby-theme-material-ui";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { BusState } from "../../../src/jdom/bus";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import UsbIcon from '@material-ui/icons/Usb';
import { useMediaQuery, useTheme } from "@material-ui/core";
import KindIcon from "../components/KindIcon";
import IconButtonWithProgress from "../components/ui/IconButtonWithProgress"
import { isWebUSBEnabled, isWebUSBSupported } from "../../../src/jdom/usb";

export default function ConnectButton(props: { full?: boolean, className?: string, transparent?: boolean }) {
    const { full, className, transparent } = props
    const { connectionState, connectAsync, disconnectAsync } = useContext<JDContextProps>(JACDACContext)
    const theme = useTheme()
    const showDisconnect = connectionState == BusState.Connected || connectionState == BusState.Disconnecting;
    const inProgress = connectionState == BusState.Connecting || connectionState == BusState.Disconnecting
    const small = !full || useMediaQuery(theme.breakpoints.down("md"))
    const disabled = connectionState != BusState.Connected && connectionState != BusState.Disconnected
    const onClick = showDisconnect ? disconnectAsync : connectAsync;
    const icon = showDisconnect ? <UsbIcon /> : <KindIcon kind="device" />
    const title = showDisconnect ? "disconnect" : "connect";

    if (!isWebUSBEnabled() || !isWebUSBSupported())
        return <></>

    if (small)
        return <span><IconButtonWithProgress
            title={title}
            color={transparent ? "inherit" : "primary"}
            className={className}
            disabled={disabled}
            indeterminate={inProgress}
            onClick={onClick}>
            {icon}
        </IconButtonWithProgress></span>
    else
        return <Button
            aria-label={title}
            size="small"
            variant={transparent ? "outlined" : "contained"}
            color={transparent ? "inherit" : "primary"}
            className={className}
            startIcon={icon}
            disabled={disabled}
            onClick={onClick}>
            {title}
        </Button>
}
