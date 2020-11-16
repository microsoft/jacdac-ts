import React, { useContext } from "react"
import { IconButton } from "gatsby-theme-material-ui";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import SystemUpdateAltIcon from '@material-ui/icons/SystemUpdateAlt';
import { Badge, Tooltip } from "@material-ui/core";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { DEVICE_CHANGE, DEVICE_FIRMWARE_INFO, FIRMWARE_BLOBS_CHANGE } from "../../../src/jdom/constants";
import useEventRaised from "../jacdac/useEventRaised";
import { computeUpdates } from "../../../src/jdom/flashing";
import useChange from "../jacdac/useChange";
import IconButtonWithTooltip from "./IconButtonWithTooltip";

export default function FlashButton(props: { className?: string }) {
    const { bus } = useContext<JDContextProps>(JACDACContext)

    const updates = useEventRaised([FIRMWARE_BLOBS_CHANGE, DEVICE_FIRMWARE_INFO],
        bus,
        bus => computeUpdates(bus.devices().map(d => d.firmwareInfo), bus.firmwareBlobs))
    const updatesCount = updates?.length || 0;
    console.log({ updates, updatesCount })
    if (!updatesCount)
        return <></>
    const title = `Firmware update ${updatesCount} available`;
    return <IconButtonWithTooltip
        title={title} {...props}
        color="inherit"
        to="/tools/updater"
        edge="start">
        <Badge badgeContent={updatesCount} color="secondary">
            <SystemUpdateAltIcon />
        </Badge>
    </IconButtonWithTooltip>
}