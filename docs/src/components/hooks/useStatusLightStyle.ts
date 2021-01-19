import { useMemo } from "react";
import { useId } from "react-use-id-hook"

export type StatusLightFrame = [number, number, number, number]

export interface StatusLightProps {
    monochrome?: boolean,
    cssProperty?: "border" | "background-color" | "color" | "fill" | "stroke"
}

export default function useStatusLightStyle(frames: StatusLightFrame[], options?: StatusLightProps) {
    const { monochrome, cssProperty } = options || {};
    const className = useId();
    // generate a CSS animation for the curren frames
    const helmetStyle = useMemo(() => {
        if (!frames?.length)
            return undefined;
        const DURATION = 3;
        const property = cssProperty || "background-color";
        const total = frames.reduce((t, row) => t + row[DURATION], 0)
        let curr = 0;
        return `@keyframes ${className} {
        ${frames.map(frame => {
            const [hue, saturation, value, duration] = frame;
            const percent = Math.floor(curr / total * 100)
            curr += duration;
            const csshue = Math.round((monochrome ? 0 : hue) * 360 / 0xff);
            const csssat = Math.round((monochrome ? 255 : saturation) * 100 / 0xff);
            const lightness = Math.round(value / 0xff * 100);
            const alpha = value === 0 ? 0 : 1;
            return `${percent}% { ${property}: hsla(${csshue}, ${csssat}%, ${lightness}%, ${alpha}); }`
        }).join("\n")}
    }
    .${className} {
        animation-duration: ${total / 1000}s;
        animation-name: ${className};
        animation-delay: 0s;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
    }`
            ;
    }, [frames?.map(frame => frame.toString()).join(), monochrome, cssProperty]);

    return { className, helmetStyle }
}
