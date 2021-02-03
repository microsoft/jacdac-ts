import React from "react";
import { useTheme } from "@material-ui/core";
import { SvgWidget } from "./SvgWidget";
import useWidgetTheme from "./useWidgetTheme";
import { useId } from "react-use-id-hook"
import useSvgButtonProps from "../hooks/useSvgButtonProps";

export default function ButtonWidget(props: {
    checked?: boolean;
    label?: string
    color?: "primary" | "secondary",
    size?: string,
    onDown?: () => void,
    onUp?: () => void
}) {
    const { checked, label, color, size, onDown, onUp } = props;
    const { background, controlBackground, active } = useWidgetTheme(color);

    const buttonProps = useSvgButtonProps<SVGCircleElement>(label, onDown, onUp)
    const w = 64;
    const mo = checked ? 3 : 5;
    const r = w / 2;
    const cx = r;
    const cy = r;
    const ro = r;
    const ri = r - mo;
    return <SvgWidget width={w} size={size}>
        <circle cx={cx} cy={cy} r={ro} fill={background} />
        <circle cx={cx} cy={cy} r={ri}
            aria-live="polite"
            fill={checked ? active : controlBackground}
            {...buttonProps}
        />
    </SvgWidget>
}