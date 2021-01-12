import React from "react";
import { useTheme } from "@material-ui/core";
import { SvgWidget } from "./SvgWidget";
import useWidgetTheme from "./useWidgetTheme";

export default function CircleDotWidget(props: {
    angle?: number;
    stepAngle?: number;
    label?: string
    color?: "primary" | "secondary",
    size?: string,
    onRotate?: (steps: number) => void
}) {
    const { angle, label, color, size, onRotate } = props;
    const theme = useTheme();
    const { background, active } = useWidgetTheme(color);

    const clickeable = !!onRotate;
    const handleRotate = (steps: number) => () => onRotate(steps);
    const w = 64;
    const r = w / 2;
    const rd = 8;
    const cx = r;
    const cy = r;
    const ro = r - rd / 2;
    const bm = 16;
    const bw = w / 8;
    return <SvgWidget width={w} size={size}>
        <circle cx={cx} cy={cy} r={ro} fill={background} />
        <circle className={clickeable && "clickeable"} cx={rd} cy={cy} r={rd} fill={active} transform={`rotate(${angle} ${cx} ${cy})`} />
        <text className={"no-pointer-events"} x={cx} y={cy + 6} textAnchor="middle" fill={theme.palette.text.primary}>{label}</text>
        {clickeable && <rect className={"clickeable"} opacity={0.3} x={0} y={bm} width={bw} height={w - bm * 2} rx={2} ry={2} onClick={handleRotate(-1)} fill={active} />}
        {clickeable && <rect className={"clickeable"} opacity={0.3} x={w - bw} y={bm} width={bw} height={w - bm * 2} rx={2} ry={2} onClick={handleRotate(1)} fill={active}/>}
    </SvgWidget>
}