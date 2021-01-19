import React, { ChangeEvent, useState } from "react";
import useStatusLightStyle, { StatusLightFrame } from "../hooks/useStatusLightStyle"
import { Card, CardContent, CardHeader, Grid, TextField, useTheme } from "@material-ui/core"
import { SvgWidget } from "../widgets/SvgWidget";
import Helmet from "react-helmet"
import Snippet from "../ui/Snippet";
import IconButtonWithTooltip from "../ui/IconButtonWithTooltip";
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import AddIcon from '@material-ui/icons/Add';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import DeleteIcon from '@material-ui/icons/Delete';
import { TwitterPicker } from "react-color";

function StatusLightFrameDesigner(props: {
    frame: StatusLightFrame,
    setFrame: (frame: StatusLightFrame) => void,
    onRemove: () => void
}) {
    const { frame, setFrame, onRemove } = props;
    const [hsv, setHsv] = useState({
        h: frame[0] * 360 / 0xff,
        s: frame[1] / 0xff,
        v: frame[2] / 0xff
    })
    const handleValue = (i: number) => (ev: ChangeEvent<HTMLInputElement>) => {
        const v = parseInt(ev.target.value);
        if (!isNaN(v)) {
            const newFrame = frame.slice(0);
            newFrame[i] = v;
            setFrame(newFrame as StatusLightFrame);
        }
    }
    const handleColorChangeComplete = (c: { hsv: { h: number; s: number; v: number; } }) => {
        const newFrame = frame.slice(0) as StatusLightFrame;
        const { hsv } = c;
        const { h, s, v } = hsv;
        newFrame[0] = (h / 360 * 0xff) & 0xff;
        newFrame[1] = (s * 0xff) & 0xff;
        newFrame[2] = (v * 0xff) & 0xff;
        setFrame(newFrame)
        setHsv(hsv);
    }

    return <Card>
        <CardHeader action={
            <IconButtonWithTooltip title="remove animation frame" disabled={!onRemove} onClick={onRemove}>
                <DeleteIcon />
            </IconButtonWithTooltip>} />
        <CardContent>
            <Grid container direction="column" spacing={1}>
                <Grid item>
                    <TwitterPicker triangle="hide"
                        color={hsv}
                        onChangeComplete={handleColorChangeComplete} />
                </Grid>
                <Grid item>
                    <TextField label="duration" helperText="ms" inputProps={{
                        type: 'number',
                        min: 0
                    }} value={frame[3]} onChange={handleValue(3)} />
                </Grid>
            </Grid>
        </CardContent>
    </Card >
}

export default function StatusLightDesigner() {
    const [frames, setFrames] = useState<StatusLightFrame[]>([
        [173, 255, 100, 1000],
        [200, 255, 100, 1000]
    ]);
    const { className, helmetStyle } = useStatusLightStyle(frames, {
        cssProperty: "fill"
    });
    const theme = useTheme();
    const handleFrame = (i: number) => (frame: StatusLightFrame) => {
        const newFrames = frames.slice(0);
        newFrames[i] = frame;
        setFrames(newFrames)
    }
    const handleRemove = (i: number) => () => {
        const newFrames = frames.slice(0);
        newFrames.splice(i, 1)
        setFrames(newFrames);
    }
    const handleAdd = () => setFrames([
        ...frames,
        frames[frames.length - 1].slice(0) as StatusLightFrame
    ]);

    return <Grid container spacing={1}>
        <Grid item>
            {helmetStyle && <Helmet><style>{helmetStyle}</style></Helmet>}
            <Card>
                <CardHeader title="preview" />
                <CardContent>
                    <SvgWidget size={"20vh"} width={64} height={64}>
                        <circle cx={32} cy={32} r={30}
                            className={className}
                            stroke={theme.palette.background.default}
                            strokeWidth={1} />
                    </SvgWidget>
                </CardContent>
            </Card>
        </Grid>
        {frames.map((frame, i) => <Grid item key={i}>
            <StatusLightFrameDesigner key={i} frame={frame} setFrame={handleFrame(i)}
                onRemove={frames.length > 1 ? handleRemove(i) : undefined} />
        </Grid>)}
        <Grid item>
            <Card>
                <CardContent>
                    <IconButtonWithTooltip title="add animation frame" disabled={frames.length > 7} onClick={handleAdd}>
                        <AddIcon />
                    </IconButtonWithTooltip>
                </CardContent>
            </Card>
        </Grid>
        <Grid item xs={12}>
            <Card>
                <CardHeader title="code" />
                <CardContent>
                    <Snippet
                        value={() => JSON.stringify(frames, null, 2)} mode={"json"}
                    />
                </CardContent>
            </Card>
        </Grid>
    </Grid>;
}