import React, { ReactNode } from "react";
import { useId } from "react-use-id-hook"

export function SvgWidget(props: {
    width: number,
    height?: number,
    size?: string,
    role?: string,
    title?: string,
    viewBox?: string,
    tabIndex?: number,
    children: ReactNode
}) {
    const { width, height, size, children, role, title, viewBox, tabIndex } = props;
    const h = height || width;
    const titleId = useId();
    return <svg
        xmlns="http://www.w3.org/2000/svg"
        tabIndex={tabIndex}
        viewBox={viewBox || `0 0 ${width} ${h}`}
        style={size && { height: size, maxWidth: "100%" }}
        aria-label={title}
        role={role || "group"}>
        {children}
    </svg>
}