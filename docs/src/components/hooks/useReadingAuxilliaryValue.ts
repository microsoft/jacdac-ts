import { useEffect, useState } from "react";
import { REPORT_UPDATE, SystemReg } from "../../../../src/jdom/constants";
import { JDRegister } from "../../../../src/jdom/register";


export default function useReadingAuxilliaryValue(register: JDRegister, identifier: number =
    SystemReg.ReadingError
    | SystemReg.MaxReading
    | SystemReg.MinReading
    | SystemReg.StreamingInterval
    | SystemReg.StreamingPreferredInterval
) {
    const { service, code } = register;
    const reading = code === SystemReg.Reading;
    const auxilliaryRegister = reading ? service.register(identifier) : undefined;
    const [value, setValue] = useState<number[]>(auxilliaryRegister?.unpackedValue);

    useEffect(() => auxilliaryRegister?.subscribe(REPORT_UPDATE, () => {
        setValue(auxilliaryRegister?.unpackedValue);
    }), [register, auxilliaryRegister]);

    return value;
}
