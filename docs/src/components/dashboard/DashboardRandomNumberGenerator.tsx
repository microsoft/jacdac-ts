import React, { useState } from "react";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import useServiceHost from "../hooks/useServiceHost";
import { Grid, TextField } from "@material-ui/core";
import Packet from "../../../../src/jdom/packet";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import RefreshIcon from '@material-ui/icons/Refresh';
import IconButtonWithTooltip from "../ui/IconButtonWithTooltip";
import useMounted from "../hooks/useMounted";
import { jdpack } from "../../../../src/jdom/pack";
import { toHex } from "../../../../src/jdom/utils";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import { RngReg } from "../../../../src/jdom/constants";

export default function DashboardRandomNumberGenerator(props: DashboardServiceProps) {
    const { service } = props;
    const randomRegister = service.register(RngReg.Random);
    const [rnd] = useRegisterUnpackedValue<[Uint8Array]>(randomRegister);

    const handleRefresh = () => randomRegister.refresh();

    return <Grid container spacing={2} direction="row">
        <Grid item xs>
            <TextField
                fullWidth={true}
                variant={"outlined"}
                helperText={"generated random number"}
                value={toHex(rnd?.slice(0, 8))} />
        </Grid>
        <Grid item>
            <IconButtonWithTooltip title="generate new number" onClick={handleRefresh}>
                <RefreshIcon />
            </IconButtonWithTooltip>
        </Grid>
    </Grid>
}