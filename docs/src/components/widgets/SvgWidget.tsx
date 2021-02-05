import React, { ReactNode } from "react";

export default function SvgWidget(props: {
    width: number,
    height?: number,
    size: string,
    role?: string,
    title?: string,
    viewBox?: string,
    tabIndex?: number,
    children: ReactNode
}) {
    const { width, height, size, children, role, title, viewBox, tabIndex } = props;
    const h = height || width;
    return <svg
        xmlns="http://www.w3.org/2000/svg"
        tabIndex={tabIndex}
        viewBox={viewBox || `0 0 ${width} ${h}`}
        style={size ? { height: size, maxWidth: "100%" } : undefined}
        aria-label={title}
        role={role || "group"}>
        {children}
    </svg>
}