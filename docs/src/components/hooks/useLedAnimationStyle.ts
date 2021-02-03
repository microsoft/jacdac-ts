import { useMemo } from "react";
import { useId } from "react-use-id-hook"
import { LedAnimationFrame } from "../../../../src/hosts/ledservicehost";
import { hsvToCss } from "../../../../src/jdom/color";
import { roundWithPrecision } from "../../../../src/jdom/utils";

export interface LedAnimationProps {
    monochrome?: boolean,
    cssProperty?: "border" | "background-color" | "color" | "fill" | "stroke",
    step?: boolean
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
    const { monochrome, cssProperty, step } = options || {};
    const className = useId();
    // generate a CSS animation for the curren frames
    const helmetStyle = useMemo(() => {
        if (!frames?.length)
            return undefined;
        const DURATION = 3;
        const property = cssProperty || "background-color";
        const total = frames.reduce((t, row) => t + row[DURATION], 0)
        const totals = (total << 3) / 1000;

        let kf = `@keyframes ${className} {\n`;
        if (step) {
            let t = 0;
            frames.forEach(frame => {
                const [hue, sat, value, duration] = frame;
                const csscolor = hsvToCss(hue, sat, value, 0xff, monochrome)
                const percent = t / total * 100;
                kf += `  ${roundWithPrecision(percent, 5)}% { ${property}: ${csscolor}); }\n`            
                t += duration;
            })
        } else {
            // 30fps
            const KEYFRAME_DURATION = 30 >> 3;
            const nkframes = Math.ceil(total / KEYFRAME_DURATION);
            for (let kframei = 0; kframei < nkframes; ++kframei) {
                const kt = kframei / (nkframes) * total;
                const { hue, saturation, value } = interpolate(frames, kt);
                // generate new keyframe
                const percent = Math.round(kframei / (nkframes - 1) * 100)
                const csscolor = hsvToCss(hue, saturation, value, 0xff, monochrome)
                kf += `  ${roundWithPrecision(percent, 5)}% { ${property}: ${csscolor}); }\n`
            }
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
    }, [frames?.map(frame => frame.toString()).join(), monochrome, step, cssProperty]);

    console.log({ frames })
    console.log(helmetStyle)
    return { className, helmetStyle }
}
