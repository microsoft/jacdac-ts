
import { Box, Grid, MenuItem, TextField, Typography, useTheme } from "@material-ui/core";
import React, { ChangeEvent, useEffect, useState } from "react";
import { LightReg, LightCmd } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceView";
import RegisterInput from "../RegisterInput";
import { lightEncode } from "../../../../src/jdom/light";
import ColorInput from "../ui/ColorInput";
import SelectWithLabel from "../ui/SelectWithLabel";
import { JDService } from "../../../../src/jdom/service";
import RemoveIcon from '@material-ui/icons/Remove';
import AddIcon from '@material-ui/icons/Add';
import IconButtonWithTooltip from "../ui/IconButtonWithTooltip";
/*
? 0xD2: fadehsv C+- similar to fade(), but colors are specified and faded in HSV
0xD6: range P=0 N=length W=1 S=0- range from pixel P, Npixels long (currently unsupported: every Wpixels skip Spixels)
0xD7: mode K=0- set update mode
0xD8: tmpmode K=0- set update mode for next command only
mult V- macro to multiply current range by given value (float)
*/

interface LightCommand {
    name: string;
    args: "C+" | "K" | "M";
    description: string;
}

const lightCommands = [
    {
        name: "setall",
        args: "C+",
        description: "set all pixels in current range to given color pattern"
    },
    {
        name: "fade",
        args: "C+",
        description: "set pixels in current range to colors between colors in sequence"
    },
    {
        name: "rotfwd",
        args: "K",
        description: "rotate (shift) pixels away from the connector",
        valueDescription: "pixel positions to rotate"
    },
    {
        name: "rotback",
        args: "K",
        description: "rotate (shift) pixels towards the connector",
        valueDescription: "pixel positions to rotate"
    },
    {
        name: "setone",
        args: "PC",
        description: "set one pixel at P(in current range) to given color",
        valueDescription: "pixel index within the current range"
    },
]

function LightCommand(props: { service: JDService, expanded: boolean }) {
    const { service, expanded } = props;
    const [command, setCommand] = useState(lightCommands[0]);

    const [offset, setOffset] = useState("1");
    const [duration, setDuration] = useState("100");
    const [colors, setColors] = useState(["#ff0000", "#0000ff"]);
    const [mode, setMode] = useState("0");

    const { name, args, description, valueDescription } = command;
    const dcolors = args == "PC" ? colors.slice(0, 1) : colors;

    const sendCommand = async () => {
        let sargs = "";
        let vargs = [];
        switch (args) {
            case "C+":
                sargs = Array(colors.length).fill("#").join(" ");
                vargs = colors.map(c => parseInt(c.slice(1), 16));
                break;
            case "K": {
                sargs = "%";
                vargs = [parseInt(offset)];
                break;
            }
            case "PC": {
                sargs = "% #";
                vargs = [parseInt(offset), parseInt(colors[0].slice(1), 16)];
                break;
            }
        }

        if (vargs.some(v => v === undefined))
            return;

        let ms = parseInt(duration);
        if (isNaN(ms)) ms = 100;
        const src = 
`tmpmode %
${name} ${sargs}
show %`
        const largs = [parseInt(mode), ...vargs, ms];
        console.log({ src, largs })
        const encoded = lightEncode(src, largs);
        await service.sendCmdAsync(LightCmd.Run, encoded);
    }
    const handleCommandChange = (ev: ChangeEvent<{ name?: string; value: unknown; }>) => {
        const newName = ev.target.value as string;
        setCommand(lightCommands.find(cmd => cmd.name === newName));
    }
    const handleOffsetChange = (ev: any) => {
        setOffset(ev.target.value);
    }
    const handleModeChange = (ev: any) => {
        setMode(ev.target.value);
    }
    const handleDurationChange = (ev: any) => {
        setDuration(ev.target.value);
    }
    const handleColorChange = (index: number) => async (color: string) => {
        const cs = colors.slice(0);
        cs[index] = color;
        setColors(cs);
    }
    const handleRemoveColor = () => {
        const cs = colors.slice(0);
        cs.pop();
        setColors(cs);
    }
    const handleAddColor = () => {
        const cs = colors.slice(0);
        cs.push('#ff0000');
        setColors(cs);
    }

    // send on change
    useEffect(() => {
        sendCommand();
    }, [name, colors])

    return <Grid container spacing={1}>
        <Grid item key="descr" xs={12}>
            <Typography variant="caption">{description}</Typography>
        </Grid>
        <Grid item key="select" xs={expanded ? 3 : 5}>
            <SelectWithLabel fullWidth={true} label="command" value={name} onChange={handleCommandChange}>
                {lightCommands.map(cmd => <MenuItem key={cmd.name} value={cmd.name}>{cmd.name}</MenuItem>)}
            </SelectWithLabel>
        </Grid>
        {expanded && <Grid item xs={2} key="time">
            <TextField variant="outlined" label={"duration"} helperText="milliseconds" type="number" value={duration} onChange={handleDurationChange} />
        </Grid>}
        {expanded && <Grid item xs={2} key="mode">
            <SelectWithLabel fullWidth={true} label="update mode" value={mode}>
                <MenuItem value={0}>replace</MenuItem>
                <MenuItem value={1}>add</MenuItem>
                <MenuItem value={2}>substract</MenuItem>
                <MenuItem value={3}>multiply</MenuItem>
            </SelectWithLabel>
        </Grid>}
        {(args === "K" || args === "PC") && <Grid item key="K">
            <TextField variant="outlined" type="number" helperText={valueDescription} value={offset} onChange={handleOffsetChange} />
        </Grid>}
        {(args === "C+" || args === "PC") && dcolors.map((c, i) => <Grid item key={i}>
            <ColorInput value={c} onChange={handleColorChange(i)} />
        </Grid>)}
        {args === "C+" && <Grid item key="minuscolor">
            <IconButtonWithTooltip disabled={colors.length < 2} title={"Remove color"} onClick={handleRemoveColor}>
                <RemoveIcon />
            </IconButtonWithTooltip>
            <IconButtonWithTooltip disabled={colors.length > 4} title={"Add color"} onClick={handleAddColor}>
                <AddIcon />
            </IconButtonWithTooltip>
        </Grid>}
    </Grid>
}

export default function DashboardLight(props: DashboardServiceProps) {
    const { service, expanded } = props;
    const brightness = service.register(LightReg.Brightness);
    const theme = useTheme();
    return (<>
        <Grid item>
            <RegisterInput register={brightness} showRegisterName={true} />
        </Grid>
        <Grid item>
            <LightCommand service={service} expanded={expanded} />
        </Grid>
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