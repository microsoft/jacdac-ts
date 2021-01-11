import React from "react";

export function SvgWidget(props: { width: number, size?: string, children: JSX.Element | JSX.Element[] }) {
    const { width, size, children } = props;
    return <svg viewBox={`0 0 ${width} ${width}`} style={size && { width: size, height: size }}>
        {children}
    </svg>
}