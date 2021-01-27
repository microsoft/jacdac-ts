import React from "react"
import useSvgButtonProps from "../hooks/useSvgButtonProps";
import { describeArc } from "./svgutils";
import useWidgetTheme from "./useWidgetTheme";

export default function PowerButton(props: {
    cx: number,
    cy: number,
    r: number,
    strokeWidth?: number,
    label?: string,
    color?: "primary" | "secondary",
    off?: boolean,
    onClick?: () => void
}) {
    const { cx, cy, r, onClick, off, color, label, strokeWidth } = props;
    const { background, active, controlBackground, textProps } = useWidgetTheme(color);
    const a = 135;
    const d = describeArc(cx, cy, r / 1.619, -a, a, true);
    const btnlabel = off ? "turn on" : "turn off";
    const buttonProps = useSvgButtonProps<SVGCircleElement>(btnlabel, onClick)
    const sw = strokeWidth || 3;
    const disabled = !onClick;

    return <g>
        <title>{btnlabel}</title>
        <circle cx={cx} cy={cy} r={r} fill={controlBackground}
            strokeWidth={sw} stroke={background}
            {...buttonProps} />
        {(off || !label) && <g transform={`rotate(180, ${cx}, ${cy})`}>
            <path d={d} strokeLinecap="round" fill="none"
                strokeWidth={sw} stroke={disabled ? background : active}
                style={({ userSelect: "none", pointerEvents: "none" })} />
            <line strokeLinecap="round" x1={cx} y1={cy} x2={cx} y2={cy + r / 2}
                stroke={disabled ? background : active} strokeWidth={sw}
                style={({ userSelect: "none", pointerEvents: "none" })} />
        </g>}
        {!off && label && <text aria-label={label} x={cx} y={cy} {...textProps}>{label}</text>}
    </g>
}