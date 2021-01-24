import React, { SVGAttributes, useRef } from "react";
import useWidgetTheme from "./useWidgetTheme";
import { SvgWidget } from "./SvgWidget";
import useThrottledValue from "../hooks/useThrottledValue"
import useArrowKeys from "../hooks/useArrowKeys";
import usePathPosition from "../hooks/useSvgPathPosition";
import { closestPoint, svgPointerPoint } from "./svgutils";
import useSvgButtonProps from "../hooks/useSvgButtonProps"
import { CSSProperties } from "@material-ui/core/styles/withStyles";

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;

    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number, large?: boolean) {

    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);

    const largeArcFlag = large !== true && (endAngle - startAngle <= 180) ? "0" : "1";

    const d = [
        "M", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0,
        end.x, end.y
    ].join(" ");

    return d;
}

function SvgSliderHandle(props: {
    pathRef: SVGPathElement,
    value: number,
    valueText: string,
    label: string,
    min: number,
    max: number,
    step: number,
    onValueChange?: (newValue: number) => void,
} & SVGAttributes<SVGCircleElement>) {
    const { pathRef, value, valueText, label, min, max, step, onValueChange, ...others } = props;
    const handleRef = useRef<SVGCircleElement>()
    const pos = usePathPosition(pathRef, (max - value) / (max - min));
    const handleMove = (newValue: number) => {
        onValueChange(Math.max(min, Math.min(max, newValue)));
    }

    const onKeyDown = useArrowKeys({
        onLeft: () => handleMove(value - step),
        onRight: () => handleMove(value + step),
        symmetric: true,
    })

    // nothing to see here
    if (!onValueChange || !pos)
        return null;

    return <circle
        ref={handleRef}
        cx={pos[0]}
        cy={pos[1]}
        className={"clickeable"}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuenow={value}
        aria-valuetext={valueText}
        aria-valuemin={min}
        aria-valuemax={max}
        onKeyDown={onKeyDown}
        {...others}
    />
}

function PowerOnButton(props: {
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

export default function GaugeWidget(props: {
    value: number,
    min: number,
    max: number,
    step?: number,
    label?: string,
    color?: "primary" | "secondary",
    size?: string,
    off?: boolean,
    variant?: "fountain",
    valueLabel?: (v: number) => string,
    onChange?: (newValue: number) => void
}) {
    const { value, label, color, size, min, max, step, variant, valueLabel, off, onChange } = props;
    const { background, active, controlBackground, textProps } = useWidgetTheme(color);

    const sliderPathRef = useRef<SVGPathElement>();
    const w = 120;
    const h = 120;
    const m = 8;
    const roff = 18;
    const sw = m << 1;
    const cx = w >> 1;
    const cy = h >> 1;
    const r = (w >> 1) - m;
    const sa = -135;
    const ea = 135;
    const _step = step || (max - min) / 10
    const displayValue = useThrottledValue(value, (max - min) * 1.619);

    const computeArc = (v: number) => {
        if (variant === "fountain") {
            const mid = (ea + sa) / 2;
            const fraction = v / (max - min) * (ea - sa);
            if (fraction < 0)
                return describeArc(cx, cy, r, mid + fraction, mid);
            else
                return describeArc(cx, cy, r, mid, mid + fraction);
        } else {
            const fraction = (v - min) / (max - min);
            const va = sa + fraction * (ea - sa);
            return describeArc(cx, cy, r, sa, va);
        }
    }

    const db = describeArc(cx, cy, r, sa, ea);
    const dvalue = computeArc(value);
    const dactual = computeArc(displayValue);
    const lineCap = "round"
    const tvalue = valueLabel(value);
    const vlabel = !off && tvalue;
    const clickeable = !!onChange;

    const handleTurnOn = () => {

    }
    const handlePointerDown = (ev: React.PointerEvent<SVGPathElement>) => {
        ev.preventDefault();
        if (!ev.buttons) return;
        const svg = sliderPathRef.current.ownerSVGElement
        const pos = svgPointerPoint(svg, ev);
        const closest = closestPoint(sliderPathRef.current, _step, pos);
        console.log({ pos, closest })
        onChange(min + (1 - closest) * (max - min))
    }
    const pointerStyle: CSSProperties = clickeable && {
        cursor: "pointer"
    }
    const pathProps: SVGAttributes<SVGPathElement> = {
        onPointerDown: clickeable && handlePointerDown,
        onPointerMove: clickeable && handlePointerDown,
        style: clickeable && pointerStyle
    }

    return <SvgWidget width={w} height={h} size={size}>
        <path ref={sliderPathRef} strokeWidth={sw} stroke={background} d={db} strokeLinecap={lineCap} fill="transparent"
            {...pathProps}
        />
        {!off && <path strokeWidth={sw} stroke={active} strokeLinecap={lineCap} d={dvalue} opacity={0.2} fill="transparent"
            {...pathProps}
        />}
        {!off && <path strokeWidth={sw} stroke={active} strokeLinecap={lineCap} d={dactual} fill="transparent"
            {...pathProps}
        />}
        {sliderPathRef.current && value !== undefined && <SvgSliderHandle
            pathRef={sliderPathRef.current}
            value={value} valueText={tvalue}
            min={min} max={max} step={_step}
            label={`${label} slider`}
            r={m - 1}
            fill={controlBackground}
            stroke={active}
            strokeWidth={2}
            onValueChange={!off && onChange}
        />}
        {off && <PowerOnButton cx={cx} cy={cy} r={roff} color={color} onClick={handleTurnOn} />}
        {vlabel && <text x={cx} y={cy} {...textProps}>{vlabel}</text>}
        {label && <text x={w >> 1} y={h - m} {...textProps}>{label}</text>}
    </SvgWidget>
}