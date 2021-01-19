import { useMemo } from "react";
import { useId } from "react-use-id-hook"
import { ControlReg, roundWithPrecision, SRV_BOOTLOADER } from "../../../../src/jacdac";
import { JDDevice } from "../../../../src/jdom/device";
import useChange from "../../jacdac/useChange";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";

const bootloaderFrames = [
    [0, 255, 0, 500],
    [5, 255, 5, 500]
];
const identifyFrames = [
    [50, 255, 0, 350],
    [50, 255, 50, 350]
];
/*
const announceTick = [
    [30, 255, 0, 400],
    [30, 255, 0, 0],
    [30, 255, 50, 100],
    [30, 255, 0, 0]
]
*/
export function useDeviceStatusLEDStyle(device: JDDevice, options?: {
    monochrome?: boolean,
    cssProperty?: "border" | "background-color" | "color" | "fill" | "stroke"
}): {
    className?: string;
    helmetStyle?: string;
} {
    const { monochrome, cssProperty } = options || {};
    const register = useChange(device, d => d.service(0).register(ControlReg.StatusLight));
    const bootloader = useChange(device, d => d.hasService(SRV_BOOTLOADER));
    const identifying = useChange(device, d => d?.identifying)
    const registerFrames = useRegisterUnpackedValue<[[number, number, number, number][]]>(register)
    const className = useId();

    // pick animation step
    const frames = identifying ? identifyFrames
        : bootloader ? bootloaderFrames
        : registerFrames?.[0];

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