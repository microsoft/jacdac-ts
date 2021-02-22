import React, { ReactNode } from "react";

export default function SvgWidget(props: {
    width: number,
    height?: number,
    size: string,
    role?: string,
    title?: string,
    viewBox?: string,
    tabIndex?: number,
    background?: string,
    children: ReactNode
}) {
    const { width, height, size, background, children, role, title, viewBox, tabIndex } = props;
    const h = height || width;
    return <svg
        xmlns="http://www.w3.org/2000/svg"
        tabIndex={tabIndex}
        viewBox={viewBox || `0 0 ${width} ${h}`}
        style={size ? { height: size, maxWidth: "100%" } : undefined}
        aria-label={title}
        role={role || "group"}>
        {background && <rect x={0} y={0} width={width} height={height} fill={background} rx={1} ry={1} />}
        {children}
    </svg>
}