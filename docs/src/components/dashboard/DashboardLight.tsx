
import { Box, Grid, Input, TextField, useTheme } from "@material-ui/core";
import React, { ChangeEvent, useEffect, useState } from "react";
import { LightReg, LightCmd } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceView";
import RegisterInput from "../RegisterInput";
import CmdButton from "../CmdButton"
import useLightEncode from "../hooks/useLightEncode";
import { useDebounce } from 'use-debounce';
import { lightEncode } from "../../../../src/jdom/light";
import useEffectAsync from "../useEffectAsync";
import { toHex } from "../../../../src/jdom/utils";
import { useId } from "react-use-id-hook"

export default function DashboardLight(props: DashboardServiceProps) {
    const { service, expanded } = props;
    const brightness = service.register(LightReg.Brightness);
    const theme = useTheme();
    const colorId = useId();
    const [color, setColor] = useState("#f000f0")
    const [source, setSource] = useState(`setall #00ff00
show
`)
    const [debouncedSource] = useDebounce(source, 300)
    const { encoded, error } = useLightEncode(debouncedSource);
    useEffectAsync(async (mounted) => {
        if (encoded) {
            await service.sendCmdAsync(LightCmd.Run, encoded);
            console.log(`send ${toHex(encoded)}`)
        }
    }, [debouncedSource]);
    const handleSourceChange = (ev: React.ChangeEvent<HTMLTextAreaElement>) => {
        setSource(ev.target.value)
    }

    const shows = [
        {
            name: "blue", code: `setall #0000ff
show` },
        {
            name: "green", code: `setall #00ff00
show` },
        {
            name: "red", code: `setall #ff0000
show` },
    ]
    const handleShow = (code: string) => async () => {
        const encoded = lightEncode(code, [])
        await service.sendCmdAsync(LightCmd.Run, encoded);
    }
    const handleColorChange = async (ev: ChangeEvent<HTMLInputElement>) => {
        const color = ev.target.value;
        setColor(color);
        const encoded = lightEncode(`setall #
show`, [parseInt(color.slice(1), 16)])
        await service.sendCmdAsync(LightCmd.Run, encoded);
    }

/*    <Grid item>
    <Input id={colorId} type="color" value={color} onChange={handleColorChange} />
</Grid>
*/

    return (<>
        <Grid item>
            <RegisterInput register={brightness} showRegisterName={true} />
        </Grid>
        {!expanded && <Grid item>
            {shows.map(show => <CmdButton size="small" variant="outlined" key={show.code} onClick={handleShow(show.code)}>{show.name}</CmdButton>)}
        </Grid>}
        {expanded && <Grid item>
            <TextField
                spellCheck={false}
                fullWidth={true}
                onChange={handleSourceChange}
                value={source}
                helperText={error || "Enter a light command and it will run automatically"}
                error={!!error}
                multiline={true}
                rows={3} />
        </Grid>}
        {expanded && <Grid item>
            <Box mt={theme.spacing(1)}>
                <Grid container spacing={1}>
                    {[LightReg.ActualBrightness, LightReg.NumPixels, LightReg.LightType, LightReg.MaxPower].map(id => <Grid item xs={12} md={6} key={id}>
                        <RegisterInput register={service.register(id)} showRegisterName={true} />
                    </Grid>)}
                </Grid>
            </Box>
        </Grid>}
    </>)
}