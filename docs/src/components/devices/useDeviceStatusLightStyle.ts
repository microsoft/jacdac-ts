import { LedAnimationFrame } from "../../../../src/hosts/ledservicehost";
import { ControlReg, SRV_BOOTLOADER } from "../../../../src/jacdac";
import { JDDevice } from "../../../../src/jdom/device";
import useChange from "../../jacdac/useChange";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useLedAnimationStyle, { LedAnimationProps } from "../hooks/useLedAnimationStyle";

const statusHue = 32
const statusSaturation = 255

//Every 524ms it changes from 5.9% and 1.6% (i.e. 1 sec duty cycle)
const bootloaderFrames: LedAnimationFrame[] = [
    [statusHue, statusSaturation, 96, 524 / 8],
    [statusHue, statusSaturation, 96, 0.1],
    [statusHue, statusSaturation, 72, 524 / 8],
    [statusHue, statusSaturation, 72, 0.1],
];
// 50ms every 150ms (50 on, 100 off) seven times (i.e. for 1 second)
const identifyFrames: LedAnimationFrame[] = [
    [statusHue, statusSaturation, 255, 50 / 8],
    [statusHue, statusSaturation, 255, 0.1],
    [statusHue, statusSaturation, 0, 100 / 8],
    [statusHue, statusSaturation, 0, 0.1],
];
// lights at 100% for 270ms, then 5.9% for rest of 530ms, 
// then goes into application that turns it on full for 200ms
const startupFrames: LedAnimationFrame[] = [
    [statusHue, statusSaturation, 255, 270 / 8],
    [statusHue, statusSaturation, 255, 0.1],
    [statusHue, statusSaturation, 6 / 100 * 0xff, 530 / 8],
    [statusHue, statusSaturation, 6 / 100 * 0xff, 0.1],
    [statusHue, statusSaturation, 255, 200 / 8],
    [statusHue, statusSaturation, 255, 0.1],
    [statusHue, statusSaturation, 0, 0.1],
];
// Synchronized fast blink 50us every 500ms
const connectedFrames: LedAnimationFrame[] = [
    [statusHue, statusSaturation, 0, 500 / 8],
    [statusHue, statusSaturation, 0, 0.1],
    [statusHue, statusSaturation, 96, 24 / 8],
    [statusHue, statusSaturation, 96, 0.1],
    [statusHue, statusSaturation, 0, 0.1],
];
//5ms every 250ms
const disconnectedFrames: LedAnimationFrame[] = [
    [statusHue, statusSaturation, 128, 40 / 8],
    [statusHue, statusSaturation, 128, 0.1],
    [statusHue, statusSaturation, 16, 250 / 8],
    [statusHue, statusSaturation, 16, 0.1],
];
// fast blink 70ms on, 70ms off - 30 times (4.2 seconds) before a reboot
const panicFrames: LedAnimationFrame[] = [
    [statusHue, statusSaturation, 128, 70 / 8],
    [statusHue, statusSaturation, 128, 0.1],
    [statusHue, statusSaturation, 16, 70 / 8],
    [statusHue, statusSaturation, 16, 0.1],
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