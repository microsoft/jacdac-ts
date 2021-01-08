
import { Box, Grid, TextField, useTheme } from "@material-ui/core";
import React, { useState } from "react";
import { LightReg, LightCmd } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceView";
import RegisterInput from "../RegisterInput";
import useLightEncode from "../hooks/useLightEncode";
import { useDebounce } from 'use-debounce';
import { lightEncode } from "../../../../src/jdom/light";
import useEffectAsync from "../useEffectAsync";
import { toHex } from "../../../../src/jdom/utils";
import ColorInput from "../ui/ColorInput";

export default function DashboardLight(props: DashboardServiceProps) {
    const { service, expanded } = props;
    const brightness = service.register(LightReg.Brightness);
    const theme = useTheme();
    const [color, setColor] = useState("#f000f0")
    const [source, setSource] = useState(`setall #00ff00
show
`)
    const [debouncedSource] = useDebounce(source, 300)
    const { encoded, error } = useLightEncode(debouncedSource);
    useEffectAsync(async () => {
        if (encoded) {
            await service.sendCmdAsync(LightCmd.Run, encoded);
            console.log(`send ${toHex(encoded)}`)
        }
    }, [debouncedSource]);
    const handleSourceChange = (ev: React.ChangeEvent<HTMLTextAreaElement>) => {
        setSource(ev.target.value)
    }

    const handleColorChange = async (color: string) => {
        setColor(color);
        const encoded = lightEncode(`setall #
show`, [parseInt(color.slice(1), 16)])
        await service.sendCmdAsync(LightCmd.Run, encoded);
    }
    return (<>
        <Grid item>
            <RegisterInput register={brightness} showRegisterName={true} />
        </Grid>
        <Grid item>
            set lights to <ColorInput value={color} onChange={handleColorChange} />
        </Grid>
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