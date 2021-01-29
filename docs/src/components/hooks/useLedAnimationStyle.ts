import { useMemo } from "react";
import { useId } from "react-use-id-hook"
import { LedAnimationFrame } from "../../../../src/hosts/ledservicehost";
import { hsvToCss } from "../../../../src/jdom/color";

export interface LedAnimationProps {
    monochromeHue?: number,
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

export default function useLedAnimationStyle(frames: LedAnimationFrame[], options?: LedAnimationProps) {
    const { monochromeHue, cssProperty } = options || {};
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
            const csscolor = hsvToCss(hue, saturation, value, 0xff, monochromeHue)
            kf += `  ${percent}% { 
    ${property}: ${csscolor});
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
    }, [frames?.map(frame => frame.toString()).join(), monochromeHue, cssProperty]);

    return { className, helmetStyle }
}
