import { LedAnimationFrame } from "../../../../src/hosts/ledservicehost";
import { ControlReg, SRV_BOOTLOADER } from "../../../../src/jacdac";
import { JDDevice } from "../../../../src/jdom/device";
import useChange from "../../jacdac/useChange";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useLedAnimationStyle, { LedAnimationProps } from "../hooks/useLedAnimationStyle";

const ledHue = 255
const bootloaderFrames: LedAnimationFrame[] = [
    [0, 255, 0, 500 >> 3],
    [5, 255, 255, 500 >> 3]
];
const identifyFrames: LedAnimationFrame[] = [
    [50, 255, 0, 250 >> 3],
    [50, 255, 255, 250 >> 3]
];
// lights at 100% for 270ms, then 5.9% for rest of 530ms, 
// then goes into application that turns it on full for 200ms
const startupFrames: LedAnimationFrame[] = [
    [0, 255, 0, 500 >> 3],
    [5, 255, 255, 500 >> 3]
];
const connectedFrames: LedAnimationFrame[] = [
    [0, 255, 0, 500 >> 3],
    [5, 255, 255, 500 >> 3]
];
const disconnectedFrames: LedAnimationFrame[] = [
    [0, 255, 0, 500 >> 3],
    [5, 255, 255, 500 >> 3]
];
const panicFrames: LedAnimationFrame[] = [
    [0, 255, 0, 500 >> 3],
    [5, 255, 255, 500 >> 3]
];

export type LEDStatus = "startup" | "identify" | "connected" | "disconnected" | "panic" | "bootloader";

export function statusAnimation(status: LEDStatus) {
    switch (status) {
        case "startup": return startupFrames;
        case "identify": return identifyFrames;
        case "connected": return connectedFrames;
        case "disconnected": return disconnectedFrames;
        case "panic": return panicFrames;
        case "bootloader": return bootloaderFrames;
        default: return [];
    }
}

export default function useDeviceStatusLightStyle(device: JDDevice, options?: LedAnimationProps) {
    const register = useChange(device, d => d.service(0).register(ControlReg.StatusLight));
    const bootloader = useChange(device, d => d.hasService(SRV_BOOTLOADER));
    const identifying = useChange(device, d => d?.identifying)
    const registerFrames = useRegisterUnpackedValue<[[number, number, number, number][]]>(register)

    // pick animation step
    const frames = identifying ? identifyFrames
        : bootloader ? bootloaderFrames
            : registerFrames?.[0];

    return useLedAnimationStyle(frames, options);
}