
import { Badge, Grid, Typography } from "@material-ui/core";
import React from "react";
import { GamepadButton, GamepadReg } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceView";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import { groupBy } from "../../../../src/jdom/utils";
import Alert from "../ui/Alert";

type GamepadButtonData = [GamepadButton, number, number];

function GamePadButtons(props: { player: string, buttons: GamepadButtonData[] }) {
    const { player, buttons } = props;
    return <Grid item>
        <Typography variant="caption">{player}</Typography>
        {buttons.map(button => <Badge>{GamepadButton[button[0]]}</Badge>)}
    </Grid>
}

export default function DashboardBuzzer(props: DashboardServiceProps) {
    const { service } = props;
    const buttonsRegister = service.register(GamepadReg.Buttons);
    // button, player index, pressure
    const values = useRegisterUnpackedValue<GamepadButtonData[]>(buttonsRegister)
        ?.filter(v => v.length === 3);
    console.log({ values })

    if (!values?.length)
        return <Alert severity="info">waiting for buttons...</Alert>

    // group by player
    const players = groupBy(values, v => "" + v[1]);
    // read each gamepad
    return <Grid container>
        {Object.keys(players).map(k => <GamePadButtons player={k} buttons={players[k]} />)}
    </Grid>
}