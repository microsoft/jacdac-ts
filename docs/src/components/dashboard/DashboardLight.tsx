
import { Box, Button, Grid, useTheme } from "@material-ui/core";
import React from "react";
import { BuzzerCmd, BuzzerReg, LightReg, LightCmd } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceView";
import RegisterInput from "../RegisterInput";
import { jdpack } from "../../../../src/jdom/pack";
import CmdButton from "../CmdButton"
import { lightEncode } from "../../../../src/jdom/light";
import { useRegisterIntValue } from "../../jacdac/useRegisterValue";

export default function DashboardLight(props: DashboardServiceProps) {
    const { service, expanded } = props;
    const brightness = service.register(LightReg.Brightness);

    const shows = [
        { name: "blue", code: `setall #0000ff
show` },
        { name: "green", code: `setall #00ff00
show` },
        { name: "red", code: `setall #ff0000
show` },
    ]
    const handleShow = (code: string) => async () => {
        const encoded = lightEncode(code, [])
        await service.sendCmdAsync(LightCmd.Run, encoded);
    }

    return (<>
        <Grid item>
            <RegisterInput register={brightness} showRegisterName={true} />
        </Grid>
        <Grid item>
            {shows.map(show => <CmdButton size="small" variant="outlined" key={show.code} onClick={handleShow(show.code)}>{show.name}</CmdButton>)}
        </Grid>
    </>)
}