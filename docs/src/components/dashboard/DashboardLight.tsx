
import { Grid, MenuItem, TextField, Typography } from "@material-ui/core";
import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { LightReg, LightCmd, CHANGE, LightVariant, RENDER } from "../../../../src/jdom/constants";
import { DashboardServiceProps } from "./DashboardServiceWidget";
import RegisterInput from "../RegisterInput";
import { lightEncode } from "../../../../src/jdom/light";
import ColorInput from "../ui/ColorInput";
import SelectWithLabel from "../ui/SelectWithLabel";
import { JDService } from "../../../../src/jdom/service";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import RemoveIcon from '@material-ui/icons/Remove';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import AddIcon from '@material-ui/icons/Add';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import IconButtonWithTooltip from "../ui/IconButtonWithTooltip";
import useServiceHost from "../hooks/useServiceHost";
import LightServiceHost from "../../../../src/hosts/lightservicehost";
import { SvgWidget } from "../widgets/SvgWidget";
import useChange from "../../jacdac/useChange";
import useWidgetTheme from "../widgets/useWidgetTheme";
import useWidgetSize from "../widgets/useWidgetSize";
/*
0xD6: range P=0 N=length W=1 S=0- range from pixel P, Npixels long (currently unsupported: every Wpixels skip Spixels)
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
]

function LightCommand(props: { service: JDService, expanded: boolean }) {
    const { service, expanded } = props;
    const [sending, setSending] = useState(false);

    const [command, setCommand] = useState(lightCommands[0]);
    const [offset, setOffset] = useState("1");
    const [duration, setDuration] = useState("100");
    const [colors, setColors] = useState(["#0000ff"]);
    const [mode, setMode] = useState(0);

    const { name, args, description, valueDescription } = command;
    const dcolors = args == "PC" ? colors.slice(0, 1) : colors;

    const encoded = useMemo(() => {
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

        if (mode)
            vargs.unshift(mode);

        if (vargs.some(v => v === undefined))
            return undefined;

        let ms = parseInt(duration);
        if (isNaN(ms))
            ms = 100;
        const src = [
            mode && `tmpmode %`,
            `${name} ${sargs}`,
            `show %`
        ].filter(l => !!l).join('\n');
        const largs = [...vargs, ms];
        const r = lightEncode(src, largs);
        return r;
    }, [command, colors, duration, offset, mode]);

    const sendCommand = async () => {
        if (!encoded) return;
        try {
            setSending(true);
            await service.sendCmdAsync(LightCmd.Run, encoded);
        }
        finally {
            setSending(false)
        }
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

    return <Grid container spacing={1}>
        <Grid item key="descr" xs={12}>
            <Typography variant="caption">{description}</Typography>
        </Grid>
        <Grid item key="select" xs={expanded ? 3 : 5}>
            <SelectWithLabel disabled={sending} fullWidth={true} label="command" value={name} onChange={handleCommandChange}>
                {lightCommands.map(cmd => <MenuItem key={cmd.name} value={cmd.name}>{cmd.name}</MenuItem>)}
            </SelectWithLabel>
        </Grid>
        {expanded && <Grid item xs={2} key="time">
            <TextField variant="outlined" label={"duration"} helperText="milliseconds" type="number" value={duration} onChange={handleDurationChange} />
        </Grid>}
        {expanded && <Grid item xs={2} key="mode">
            <SelectWithLabel fullWidth={true} label="update mode" value={mode + ""} onChange={handleModeChange}>
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
        <Grid item key="run">
            <IconButtonWithTooltip disabled={!encoded} title={"Run command"} onClick={sendCommand}>
                <PlayArrowIcon />
            </IconButtonWithTooltip>
        </Grid>
    </Grid>
}

function LightWidget(props: DashboardServiceProps) {
    const { service } = props;
    const host = useServiceHost<LightServiceHost>(service);
    const { background, controlBackground } = useWidgetTheme()
    const widgetSize = useWidgetSize()
    const [numPixels] = useChange(host.numPixels, r => r.values<[number]>());
    const [variant] = useChange(host.variant, r => r.values<[LightVariant]>());
    const pathRef = useRef<SVGPathElement>(undefined)
    const pixelsRef = useRef<SVGGElement>(undefined);

    const neoradius = 6;
    const neoperimeter = numPixels * (3 * neoradius)
    const ringradius = neoperimeter / (2 * Math.PI)
    const margin = 2 * neoradius;
    const width = 2 * (margin + ringradius);
    const height = width;
    const neocircleradius = neoradius + 1;
    const sw = margin;
    const wm = width - 2 * margin;
    let d = "";
    //if (variant === LightVariant.Ring)
    d = `M ${margin},${height >> 1} a ${ringradius},${ringradius} 0 1,0 ${wm},0 a ${ringradius},${ringradius} 0 1,0 -${wm},0`

    // reposition pixels along the path
    useEffect(() => {
        const p = pathRef.current;
        const pixels = pixelsRef.current.children;
        const pn = pixels.length;
        const length = p.getTotalLength();
        const extra = variant === LightVariant.Ring ? 0 : 1;
        const step = length / (pn + extra);

        for (let i = 0; i < pn; ++i) {
            const pixel = pixels.item(i) as SVGCircleElement;
            const point = p.getPointAtLength(step * (i + (extra >> 1)));
            pixel.setAttribute("cx", "" + point.x);
            pixel.setAttribute("cy", "" + point.y);
        }
    }, [variant, numPixels])

    // update DOM directly
    useEffect(() => host.subscribe(RENDER, () => {
        const colors = host.colors;
        const pixels = pixelsRef.current.children;
        const pn = Math.min(pixels.length, colors.length / 3);
        let ci = 0;
        for (let i = 0; i < pn; ++i) {
            const pixel = pixels.item(i) as SVGCircleElement;
            pixel.setAttribute("fill", `rgb(${colors[ci]}, ${colors[ci + 1]}, ${colors[ci + 2]})`)
            ci += 3;
        }
    }), [host]);

    return <SvgWidget width={width} height={height} size={widgetSize}>
        <>
            <path ref={pathRef} d={d} fill="transparent" stroke={background} strokeWidth={sw} />
            <g ref={pixelsRef}>
                {Array(numPixels).fill(0).map((_, i) => <circle key={"pixel" + i}
                        r={neocircleradius}
                        cx={width >> 1} cy={height >> 1}
                        stroke={controlBackground}
                        strokeWidth={1}
                    />)}
            </g>
        </>
    </SvgWidget>
}

export default function DashboardLight(props: DashboardServiceProps) {
    const { service, expanded } = props;
    const brightness = service.register(LightReg.Brightness);
    const host = useServiceHost<LightServiceHost>(service);
    return <>
        {host && <LightWidget {...props} />}
        {expanded && <Grid container spacing={1}>
            <Grid item xs={12}>
                <RegisterInput register={brightness} showRegisterName={true} />
            </Grid>
            <Grid item xs={12}>
                <LightCommand service={service} expanded={expanded} />
            </Grid>
        </Grid>}
    </>
}