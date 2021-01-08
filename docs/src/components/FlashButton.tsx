import React, { useContext } from "react"
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import SystemUpdateAltIcon from '@material-ui/icons/SystemUpdateAlt';
import { Badge } from "@material-ui/core";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { DEVICE_FIRMWARE_INFO, FIRMWARE_BLOBS_CHANGE } from "../../../src/jdom/constants";
import useEventRaised from "../jacdac/useEventRaised";
import { computeUpdates } from "../../../src/jdom/flashing";
import IconButtonWithTooltip from "./ui/IconButtonWithTooltip";
import useDevices from "./hooks/useDevices";

export default function FlashButton(props: { className?: string }) {
    const { bus } = useContext<JDContextProps>(JACDACContext)

    const devices = useDevices({ ignoreSelf: true })
    const updates = useEventRaised([FIRMWARE_BLOBS_CHANGE, DEVICE_FIRMWARE_INFO],
        bus,
        bus => computeUpdates(devices.map(d => d.firmwareInfo), bus.firmwareBlobs))

    if (!updates?.length)
        return <></>

    const title = `Firmware update ${updates.length} available`;
    return <IconButtonWithTooltip
        title={title} {...props}
        color="inherit"
        to="/tools/updater"
        edge="start">
        <Badge badgeContent={updates.length} color="secondary">
            <SystemUpdateAltIcon />
        </Badge>
    </IconButtonWithTooltip>
}