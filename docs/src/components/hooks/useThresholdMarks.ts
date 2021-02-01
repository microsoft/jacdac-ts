import { Mark } from "@material-ui/core";
import { JDService, SystemReg } from "../../../../src/jacdac";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";

export default function useThresholdMarks(service: JDService): Mark[] {
    const [low] = useRegisterUnpackedValue<[number]>(service.register(SystemReg.LowThreshold))
    const [high] = useRegisterUnpackedValue<[number]>(service.register(SystemReg.HighThreshold))

    return [
        { value: low, label: "low" },
        { value: high, label: "high" }
    ].filter(m => m.value !== undefined)
}