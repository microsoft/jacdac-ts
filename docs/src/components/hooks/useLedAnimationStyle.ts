import { useMemo } from "react";
import { useId } from "react-use-id-hook"

export type LedAnimationFrame = [number, number, number, number]

export function hueToCSSHue(hue: number) {
    return hue * 360 / 0xff
}
export interface LedAnimationProps {
    monochrome?: boolean,
    cssProperty?: "border" | "background-color" | "color" | "fill" | "stroke"
}

function interpolate(frames: LedAnimationFrame[], time: number) {
    let framet = 0;
    const nframes = frames.length;
    for (let i = 0; i < nframes; ++i) {
        const frame = frames[i];
        if (i == nframes - 1 || (time >= framet && time < framet + frame[3])) {
            // found time interval
            const frame1 = i == nframes - 1 ? frames[0] : frames[i + 1]
            const ratio = (time - framet) / frame[3];
            const ratiom1 = 1 - ratio;
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

function hsv_to_hsl(h: number, s: number, v: number) {
    // both hsv and hsl values are in [0, 1]
    const l = (2 - s) * v / 2;

    if (l != 0) {
        if (l == 1) {
            s = 0
        } else if (l < 0.5) {
            s = s * v / (l * 2)
        } else {
            s = s * v / (2 - l * 2)
        }
    }

    return [h, s, l]
}

export default function useLedAnimationStyle(frames: LedAnimationFrame[], options?: LedAnimationProps) {
    const { monochrome, cssProperty } = options || {};
    const className = useId();
    // generate a CSS animation for the curren frames
    const helmetStyle = useMemo(() => {
        if (!frames?.length)
            return undefined;
        const DURATION = 3;
        const property = cssProperty || "background-color";
        const total = frames.reduce((t, row) => t + row[DURATION], 0)
        const totals = (total << 3) / 1000;
        // 25fps
        const KEYFRAME_DURATION = 40 >> 3;
        const nkframes = Math.ceil(total / KEYFRAME_DURATION);
        let kf = `@keyframes ${className} {\n`;
        for (let kframei = 0; kframei < nkframes; ++kframei) {
            const kt = kframei / (nkframes) * total;
            const { hue, saturation, value } = interpolate(frames, kt);
            // generate new keyframe
            const percent = Math.round(kframei / (nkframes - 1) * 100)
            const csshue = (monochrome ? 0 : hue) * 360 / 0xff;
            const csssat = (monochrome ? 0xff : saturation) / 0xff;
            const cssval = value / 0xff;
            const [h, s, l] = hsv_to_hsl(csshue, csssat, cssval)
            const alpha = l;
            kf += `  ${percent}% { 
    ${property}: hsla(${h}, ${s * 100}%, ${l * 100}%, ${alpha});
  }\n`
        }
        kf += `}\n`; // @keyframes
        // class
        kf += `.${className} {
  animation-duration: ${totals}s;
  animation-name: ${className};
  animation-delay: 0s;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}`;
        return kf;
    }, [frames?.map(frame => frame.toString()).join(), monochrome, cssProperty]);

    return { className, helmetStyle }
}
