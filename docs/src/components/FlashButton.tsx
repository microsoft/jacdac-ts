import React, { useContext } from "react"
import { IconButton } from "gatsby-theme-material-ui";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import SystemUpdateAltIcon from '@material-ui/icons/SystemUpdateAlt';
import { Badge, Tooltip } from "@material-ui/core";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { DEVICE_FIRMWARE_INFO, FIRMWARE_BLOBS_CHANGE } from "../../../src/dom/constants";
import useEventRaised from "../jacdac/useEventRaised";
import { computeUpdates } from "../../../src/dom/flashing";
import useChange from "../jacdac/useChange";

export default function FlashButton(props: { className?: string }) {
    const { bus } = useContext<JDContextProps>(JACDACContext)

    const devices = useChange(bus, bus => bus.devices())
    const updates = useEventRaised([FIRMWARE_BLOBS_CHANGE, DEVICE_FIRMWARE_INFO],
        bus,
        bus => computeUpdates(devices.map(d => d.firmwareInfo), bus.firmwareBlobs))

    if (!updates?.length)
        return <></>

    const title = `Firmware update ${updates.length} available`;
    return <Tooltip aria-label={title} title={title} {...props}>
        <span>
            <IconButton
                color="inherit"
                to="/tools/updater"
                edge="start">
                <Badge badgeContent={updates.length} color="secondary">
                    <SystemUpdateAltIcon />
                </Badge>
            </IconButton>
        </span>
    </Tooltip>
}