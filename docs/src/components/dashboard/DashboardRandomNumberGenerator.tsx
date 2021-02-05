import React, { useState } from "react";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import useServiceHost from "../hooks/useServiceHost";
import { Grid, TextField } from "@material-ui/core";
import Packet from "../../../../src/jdom/packet";
import { jdpack, RngCmd, toHex } from "../../../../src/jacdac";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import RefreshIcon from '@material-ui/icons/Refresh';
import IconButtonWithTooltip from "../ui/IconButtonWithTooltip";
import useMounted from "../hooks/useMounted";

export default function DashboardRandomNumberGenerator(props: DashboardServiceProps) {
    const { service } = props;
    const [rnd, setRnd] = useState<Uint8Array>(undefined);
    const n = 32;
    const mounted = useMounted();

    const handleRefresh = async () => {
        const pkt = Packet.from(RngCmd.Random, jdpack<[number]>("u8", [n]));
        const resp = await service.sendCmdAwaitResponseAsync(pkt)
        if (mounted())
            setRnd(resp.data);
    }

    return <Grid container spacing={2} direction="row">
        <Grid item xs>
            <TextField
                disabled={true}
                fullWidth={true}
                variant={"outlined"}
                helperText={"generated random number"}
                value={toHex(rnd)} />
        </Grid>
        <Grid item>
            <IconButtonWithTooltip title="generate new number" onClick={handleRefresh}>
                <RefreshIcon />
            </IconButtonWithTooltip>
        </Grid>
    </Grid>
}