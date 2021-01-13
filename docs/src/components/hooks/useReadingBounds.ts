import { useEffect, useState } from "react";
import { REPORT_UPDATE, SystemReg } from "../../../../src/jdom/constants";
import { JDRegister } from "../../../../src/jdom/register";

export default function useReadingBounds(register: JDRegister) {
    const { service, address } = register;
    const reading = address === SystemReg.Reading;
    const minReadingRegister = reading ? service.register(SystemReg.MinReading) : undefined;
    const maxReadingRegister = reading ? service.register(SystemReg.MaxReading) : undefined;
    const [minReading, setMin] = useState<number[]>(minReadingRegister?.unpackedValue);
    const [maxReading, setMax] = useState<number[]>(maxReadingRegister?.unpackedValue);

    useEffect(() => minReadingRegister?.subscribe(REPORT_UPDATE, () => {
        setMin(minReadingRegister?.unpackedValue);
    }), [register, minReadingRegister]);
    useEffect(() => maxReadingRegister?.subscribe(REPORT_UPDATE, () => {
        setMax(maxReadingRegister?.unpackedValue);
    }), [register, maxReadingRegister]);

    return {
        reading,
        minReading,
        maxReading
    }
}