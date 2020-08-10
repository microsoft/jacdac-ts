import React, { useContext } from "react"
import { IconButton } from "gatsby-theme-material-ui";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import GetAppIcon from '@material-ui/icons/GetApp';
import { Badge } from "@material-ui/core";
import JacdacContext from "../../../src/react/Context";
import { DEVICE_FIRMWARE_INFO, FIRMWARE_BLOBS_CHANGE } from "../../../src/dom/constants";
import useEvent from "../jacdac/useEvent";
import { computeUpdates } from "../../../src/dom/flashing";

export default function FlashButton() {
    const { bus } = useContext(JacdacContext)

    const updates = useEvent([FIRMWARE_BLOBS_CHANGE, DEVICE_FIRMWARE_INFO],
        bus,
        bus => computeUpdates(bus.devices().map(d => d.firmwareInfo), bus.firmwareBlobs))

    return <IconButton
        color="inherit"
        aria-label={`Firmware updater ${updates.length} available`}
        to="/tools/updater">
        <Badge badgeContent={updates?.length} color="secondary">
            <GetAppIcon />
        </Badge>
    </IconButton>
}