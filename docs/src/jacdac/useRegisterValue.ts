import React, { useEffect, useState } from "react";
import { REPORT_UPDATE } from "../../../src/jdom/constants";
import { JDRegister } from "../../../src/jdom/register";

export function useRegisterHumanValue(register: JDRegister): string {
    const [value, setValue] = useState<string>(register?.humanValue)
    // update value
    useEffect(() => register?.subscribe(REPORT_UPDATE, () => {
        setValue(register?.humanValue)
    }), [register])
    return value;
}

export function useRegisterIntValue(register: JDRegister): number {
    const [value, setValue] = useState<number>(register?.intValue)
    // update value
    useEffect(() => register?.subscribe(REPORT_UPDATE, () => {
        setValue(register?.intValue)
    }), [register])
    return value;
}

export function useRegisterStringValue(register: JDRegister): string {
    const [value, setValue] = useState<string>(register?.stringValue)
    // update value
    useEffect(() => register?.subscribe(REPORT_UPDATE, () => {
        setValue(register?.stringValue)
    }), [register])
    return value;
}
