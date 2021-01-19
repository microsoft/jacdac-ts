import React from "react";
import { useId } from "react-use-id-hook"

export function SvgWidget(props: {
    width: number,
    height?: number,
    size?: string,
    role?: string,
    title?: string,
    children: JSX.Element | JSX.Element[]
}) {
    const { width, height, size, children, role, title } = props;
    const h = height || width;
    const titleId = useId();
    return <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${width} ${h}`}
        style={size && { height: size, maxWidth: "100%" }}
        aria-labelledby={titleId}
        role={role || "group"}>
        {title && <title id={titleId}>{title}</title>}
        {children}
    </svg>
}