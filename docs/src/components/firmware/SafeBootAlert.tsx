import { Box, Switch, Typography } from "@material-ui/core";
import React, { useContext, useEffect, useState } from "react";
// tslint:disable-next-line: no-submodule-imports
import JACDACContext, { JDContextProps } from "../../../../src/react/Context";
import Packet from "../../../../src/jdom/packet";
import { ControlCmd, SRV_CTRL } from "../../../../src/jdom/constants";
import Alert from "../ui/Alert";

export default function SafeBootAlert() {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const [safeBoot, setSafeBoot] = useState(bus.safeBoot);

    const handleRecovery = async () => {
        const v = !safeBoot;
        setSafeBoot(v);
    }

    // turn on and off safeboot mode
    useEffect(() => {
        bus.safeBoot = safeBoot;
        return () => { bus.safeBoot = false }
    }, [safeBoot]);

    return (
            <Alert severity="info">
                <Switch value={safeBoot} onChange={handleRecovery} />
                <Typography component="span" variant="body1">
                    recovery mode
                </Typography>
                <Box mr={1}>
                    <Typography component="span" variant="caption">
                        If your module is malfunctioning from the start, you can flash it in bootloader mode.
                        Turn on recovery mode and unplug/replug any malfunctioning device to switch it to bootloader mode (glowing status LED).
                        Once your module is flashed, turn off recovery mode and unplug/replug your module again.
                    </Typography>
                </Box>
            </Alert>
    )
}
