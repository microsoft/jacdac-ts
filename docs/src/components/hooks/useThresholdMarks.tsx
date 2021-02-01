import React from "react"
import { Mark } from "@material-ui/core";
import { JDService, SystemEvent, SystemReg } from "../../../../src/jacdac";
import { useRegisterUnpackedValue } from "../../jacdac/useRegisterValue";
import EventBadge from "../ui/EventBadge"

export default function useThresholdMarks(service: JDService): Mark[] {
    const marks: Mark[] = [];
    const lowRegister = service.register(SystemReg.LowThreshold);
    const [low] = useRegisterUnpackedValue<[number]>(lowRegister)
    const highRegister = service.register(SystemReg.HighThreshold);
    const [high] = useRegisterUnpackedValue<[number]>(highRegister)

    if (low !== undefined) {
        const lowEvent = service.event(SystemEvent.Low);
        marks.push({
            value: low,
            label: lowEvent ? <EventBadge event={lowEvent} /> : lowRegister.name
        });
    }

    if (high !== undefined) {
        const highEvent = service.event(SystemEvent.High);
        marks.push({
            value: high,
            label: highEvent ? <EventBadge event={highEvent} /> : highRegister.name
        });
    }
    
    return marks;
}