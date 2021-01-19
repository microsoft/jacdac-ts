import React, { ChangeEvent, useState } from "react";
import useStatusLightStyle, { StatusLightFrame } from "../hooks/useStatusLightStyle"
import { Grid, TextField, Input } from "@material-ui/core"
import { Button } from "gatsby-theme-material-ui";
import { SvgWidget } from "../widgets/SvgWidget";
import useWidgetSize from "../widgets/useWidgetSize";
import Helmet from "react-helmet"
import Snippet from "../ui/Snippet";
import IconButtonWithTooltip from "../ui/IconButtonWithTooltip";
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import AddIcon from '@material-ui/icons/Add';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import DeleteIcon from '@material-ui/icons/Delete';

function StatusLightFrameDesigner(props: {
    frame: StatusLightFrame,
    setFrame: (frame: StatusLightFrame) => void,
    onRemove: () => void
}) {
    const { frame, setFrame, onRemove } = props;
    const byteInputProps = {
        step: 5,
        min: 0,
        max: 255,
        type: 'number'
    };
    const handleValue = (i: number) => (ev: ChangeEvent<HTMLInputElement>) => {
        const v = parseInt(ev.target.value);
        if (!isNaN(v)) {
            const newFrame = frame.slice(0);
            newFrame[i] = v;
            setFrame(newFrame as StatusLightFrame);
        }
    }

    return <Grid container direction="row" spacing={2}>
        <Grid item>
            <TextField label="hue" inputProps={byteInputProps} value={frame[0]} onChange={handleValue(0)} />
        </Grid>
        <Grid item>
            <TextField label="saturation" inputProps={byteInputProps} value={frame[1]} onChange={handleValue(1)} />
        </Grid>
        <Grid item>
            <TextField label="value" inputProps={byteInputProps} value={frame[2]} onChange={handleValue(2)} />
        </Grid>
        <Grid item>
            <TextField label="duration" helperText="ms" inputProps={{
                type: 'number',
                min: 0
            }} value={frame[3]} onChange={handleValue(3)} />
        </Grid>
        <Grid item>
            <IconButtonWithTooltip title="remove animation frame" disabled={!onRemove} onClick={onRemove}>
                <DeleteIcon />
            </IconButtonWithTooltip>
        </Grid>
    </Grid>
}

export default function StatusLightDesigner() {
    const [frames, setFrames] = useState<StatusLightFrame[]>([
        [0, 255, 100, 500], 
        [180, 255, 100, 500],
        [0, 255, 100, 500]
    ]);
    const { className, helmetStyle } = useStatusLightStyle(frames, {
        cssProperty: "fill"
    });
    const widgetSize = useWidgetSize();
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
    const handleAdd = () => setFrames([...frames, [0, 255, 100, 500]]);

    return <Grid container spacing={1}>
        {frames.map((frame, i) => <Grid item xs={12} key={i}>
            <StatusLightFrameDesigner key={i} frame={frame} setFrame={handleFrame(i)}
                onRemove={frames.length > 1 ? handleRemove(i) : undefined} />
        </Grid>)}
        <Grid item xs={12}>
            <IconButtonWithTooltip title="add animation frame" disabled={frames.length > 7} onClick={handleAdd}>
                <AddIcon />
            </IconButtonWithTooltip>
        </Grid>
        {helmetStyle && <Grid item>
            <Helmet><style>{helmetStyle}</style></Helmet>
            <SvgWidget size={widgetSize} width={64} height={64}>
                <circle cx={32} cy={32} r={32} className={className} />
            </SvgWidget>
        </Grid>}
        <Grid item xs={12}>
            <Snippet value={() => JSON.stringify(frames, null, 2)} mode={"json"} />
        </Grid>
    </Grid>
}