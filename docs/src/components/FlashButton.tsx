import React, { useContext } from "react"
import { IconButton } from "gatsby-theme-material-ui";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import SystemUpdateAltIcon from '@material-ui/icons/SystemUpdateAlt';
import { Badge } from "@material-ui/core";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { DEVICE_FIRMWARE_INFO, FIRMWARE_BLOBS_CHANGE } from "../../../src/dom/constants";
import useEventRaised from "../jacdac/useEventRaised";
import { computeUpdates } from "../../../src/dom/flashing";
import useChange from "../jacdac/useChange";

export default function FlashButton() {
    const { bus } = useContext<JDContextProps>(JACDACContext)

    const devices = useChange(bus, bus => bus.devices())
    const updates = useEventRaised([FIRMWARE_BLOBS_CHANGE, DEVICE_FIRMWARE_INFO],
        bus,
        bus => computeUpdates(devices.map(d => d.firmwareInfo), bus.firmwareBlobs))

    return <IconButton
        color="inherit"
        aria-label={`Firmware update ${updates.length} available`}
        to="/tools/updater">
        <Badge badgeContent={updates.length} color="secondary">
            <SystemUpdateAltIcon />
        </Badge>
    </IconButton>
}