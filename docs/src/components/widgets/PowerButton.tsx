import React from "react"
import useSvgButtonProps from "../hooks/useSvgButtonProps";
import { describeArc } from "./svgutils";
import useWidgetTheme from "./useWidgetTheme";

export default function PowerButton(props: {
    cx: number,
    cy: number,
    r: number,
    color?: "primary" | "secondary",
    onClick?: () => void
}) {
    const { cx, cy, r, onClick, color } = props;
    const { background, active, controlBackground, textProps } = useWidgetTheme(color);
    const a = 135;
    const d = describeArc(cx, cy, r / 1.619, -a, a, true);
    const buttonProps = useSvgButtonProps<SVGCircleElement>("turn on", onClick)
    const sw = 3;

    return <g transform={`rotate(180, ${cx}, ${cy})`}>
        <circle cx={cx} cy={cy} r={r} fill={controlBackground}
            strokeWidth={sw} stroke={active}
            {...buttonProps} />
        <path d={d} strokeLinecap="round" fill="none"
            strokeWidth={sw} stroke={active}
            style={({ userSelect: "none", pointerEvents: "none" })} />
        <line strokeLinecap="round" x1={cx} y1={cy} x2={cx} y2={cy + r / 2}
            stroke={active} strokeWidth={sw}
            style={({ userSelect: "none", pointerEvents: "none" })} />
    </g>
}