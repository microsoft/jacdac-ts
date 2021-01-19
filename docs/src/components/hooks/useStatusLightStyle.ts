import { useMemo } from "react";
import { useId } from "react-use-id-hook"

export type StatusLightFrame = [number, number, number, number]

export interface StatusLightProps {
    monochrome?: boolean,
    cssProperty?: "border" | "background-color" | "color" | "fill" | "stroke"
}

function interpolate(frames: StatusLightFrame[], time: number) {
    let framet = 0;
    const nframes = frames.length;
    for (let i = 0; i < nframes; ++i) {
        const frame = frames[i];
        if (i == nframes - 1 || (time >= framet && time < framet + frame[3])) {
            // found time interval
            const frame1 = i == nframes - 1 ? frames[0] : frames[i + 1]
            const ratio = (time - framet) / frame[3];
            const ratiom1 = 1 - ratio;
            console.log({ ratio, ratiom1 })
            return {
                hue: ratio * frame[0] + ratiom1 * frame1[0],
                saturation: ratio * frame[1] + ratiom1 * frame1[1],
                value: ratio * frame[2] + ratiom1 * frame1[2],
            }
        } else {
            // keep adding time
            framet += frame[3]; // current start time of frame
        }
    }

    return { hue: 0, saturation: 0, value: 0 };
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
        // one animation frame every 100ms
        const KEYFRAME_DURATION = 100;
        const nkframes = Math.ceil(total / KEYFRAME_DURATION);
        let kf = `@keyframes ${className} {\n`;
        for (let kframei = 0; kframei < nkframes; ++kframei) {
            const kt = kframei / (nkframes - 1) * total;
            const { hue, saturation, value } = interpolate(frames, kt);
            console.log({ frames, kframei, kt, hue, saturation, value })
            // generate new keyframe
            const percent = Math.round(kframei / (nkframes - 1) * 100)
            const csshue = Math.round((monochrome ? 0 : hue) * 360 / 0xff);
            const csssat = Math.round((monochrome ? 255 : saturation) * 100 / 0xff);
            const lightness = Math.round(value / 0xff * 100);
            const alpha = 1;//value / 0xff;
            kf += `  ${percent}% { 
    ${property}: hsla(${csshue}, ${csssat}%, ${lightness}%, ${alpha});
  }\n`
        }
        kf += `}\n`; // @keyframes
        // class
        kf += `.${className} {
  animation-duration: ${total / 1000}s;
  animation-name: ${className};
  animation-delay: 0s;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}`;
        console.log({ frames, total, nkframes, kf })
        return kf;
    }, [frames?.map(frame => frame.toString()).join(), monochrome, cssProperty]);

    return { className, helmetStyle }
}
