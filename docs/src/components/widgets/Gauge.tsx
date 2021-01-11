import { createStyles, makeStyles } from "@material-ui/core";
import React, { useEffect, useRef } from "react";
import SvgGauge from "svg-gauge";

const useStyles = makeStyles((theme) => {
    const { palette } = theme;
    const { primary, secondary, info, text } = palette;
    return createStyles({
        gauge: (props: { size?: string, color?: "primary" | "secondary" }) => ({ //The CSS class of the gauge (gauge)
            width: props.size || "100%",
            height: props.size || "100%",
            display: "block"
        }),
        dial: { // The CSS class of the gauge's dial (dial)
            stroke: theme.palette.background.default,
            strokeWidth: 10,
        },
        // // The CSS class of the gauge's fill (value dial) (value)
        valueDial: (props: { size?: string, color?: "primary" | "secondary" }) => {
            const { color } = props;
            return {
                strokeWidth: 10,
                stroke: color === "primary" ? primary.main
                    : color === "secondary" ? secondary.main
                        : info.main
            }
        },
        value: {
            fill: text.primary,
            fontSize: "1.5em"
        },
    })
});

export default function Gauge(props: {
    value: number,
    initialValue?: number,
    showValue?: boolean,
    min?: number,
    max?: number,
    animDuration?: number,
    color?: "primary" | "secondary",
    label?: (v: number) => string,
    dialStartAngle?: number,
    dialEndAngle?: number,
    radius?: number,
    size?: string,
}) {
    const { value, initialValue, color, size, ...options } = props;
    const classes = useStyles({ color, size });
    const gaugeEl = useRef(null);
    const gaugeRef = useRef(null);
    useEffect(() => {
        if (!gaugeRef.current) {
            const ops: any = options;
            ops.dialClass = classes.dial;
            ops.gaugeClass = classes.gauge;
            ops.valueClass = classes.value;
            ops.valueDialClass = classes.valueDial;
            gaugeRef.current = SvgGauge(gaugeEl.current, ops);
            gaugeRef.current.setValue(initialValue || value);
        }
    }, []);

    useEffect(() => gaugeRef.current?.setValue(props.value, 1), [value]);

    return <div ref={gaugeEl} className="gauge-container" />;
};
