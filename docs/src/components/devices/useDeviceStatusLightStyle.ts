import { ControlReg, SRV_BOOTLOADER } from "../../../../src/jacdac";
import { JDDevice } from "../../../../src/jdom/device";
import useChange from "../../jacdac/useChange";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import useStatusLightStyle, { StatusLightFrame, StatusLightProps } from "../hooks/useStatusLightStyle";

const bootloaderFrames: StatusLightFrame[] = [
    [0, 255, 0, 500],
    [5, 255, 5, 500]
];
const identifyFrames: StatusLightFrame[] = [
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

export function useDeviceStatusLightStyle(device: JDDevice, options?: StatusLightProps) {
    const register = useChange(device, d => d.service(0).register(ControlReg.StatusLight));
    const bootloader = useChange(device, d => d.hasService(SRV_BOOTLOADER));
    const identifying = useChange(device, d => d?.identifying)
    const registerFrames = useRegisterUnpackedValue<[[number, number, number, number][]]>(register)

    // pick animation step
    const frames = identifying ? identifyFrames
        : bootloader ? bootloaderFrames
            : registerFrames?.[0];

    return useStatusLightStyle(frames, options);
}