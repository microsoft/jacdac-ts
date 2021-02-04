import { Typography } from "@material-ui/core";
import React, { useContext } from "react";
import { prettySize } from "../../../src/jdom/pretty";
import { roundWithPrecision } from "../../../src/jdom/utils";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import useChange from "../jacdac/useChange";

export default function PacketStats() {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const { stats } = bus;

    const current = useChange(stats, s => s.current);

    return <Typography variant="caption" component="span">
            {prettySize(current.bytes)}/s
        </Typography>
}
