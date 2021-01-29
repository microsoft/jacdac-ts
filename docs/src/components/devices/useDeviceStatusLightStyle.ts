import { ControlReg, SRV_BOOTLOADER } from "../../../../src/jacdac";
import { JDDevice } from "../../../../src/jdom/device";
import useChange from "../../jacdac/useChange";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useLedAnimationStyle, { LedAnimationFrame, LedAnimationProps } from "../hooks/useLedAnimationStyle";

const bootloaderFrames: LedAnimationFrame[] = [
    [0, 255, 0, 500 >> 3],
    [5, 255, 255, 500 >> 3]
];
const identifyFrames: LedAnimationFrame[] = [
    [50, 255, 0, 250 >> 3],
    [50, 255, 255, 250 >> 3]
];

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