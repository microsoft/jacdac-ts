import React from "react";

export function SvgWidget(props: { width: number, height?: number, size?: string, children: JSX.Element | JSX.Element[] }) {
    const { width, height, size, children } = props;
    const h = height || width;
    return <svg viewBox={`0 0 ${width} ${h}`} style={size && {
        width: size
    }}>
        {children}
    </svg>
}