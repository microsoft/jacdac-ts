import React, { useMemo } from "react";
import { SystemReg } from "../../../../src/jdom/constants";
import { JDService } from "../../../../src/jdom/service";
import useChange from "../../jacdac/useChange";
import AutoGrid from "../ui/AutoGrid";
import RegisterInput from "../RegisterInput";
import { isReading, isRegister } from "../../../../src/jdom/spec";
import { DashboardServiceProps } from "./DashboardServiceView";

// filter out common registers
const ignoreRegisters = [
    SystemReg.StatusCode,
    SystemReg.StreamingPreferredInterval,
    SystemReg.StreamingSamples,
    SystemReg.StreamingInterval
]
const collapsedRegisters = [
    SystemReg.Reading,
    SystemReg.Value,
    SystemReg.Intensity
]

export default function DashboardService(props: DashboardServiceProps) {
    const { service, expanded } = props;
    const specification = useChange(service, spec => spec.specification);
    const registers = useMemo(() => {
        const packets = specification?.packets;
        let ids = packets
            ?.filter(pkt => isRegister(pkt))
            ?.map(pkt => pkt.identifier) || []
        ids = ids.filter(id => ignoreRegisters.indexOf(id) < 0)
        if (!expanded) // grab the first interresting register
            ids = ids.filter(id => collapsedRegisters.indexOf(id) > -1)
                .slice(0, 1);
        return ids.map(id => service.register(id))
            .filter(reg => !!reg);
    }, [specification, expanded])

    if (!registers?.length)  // nothing to see here
        return null;

    return <AutoGrid spacing={1}>
        {registers.map(register => <RegisterInput key={register.id}
            register={register}
            showServiceName={expanded}
            showRegisterName={expanded || !isReading(register.specification)}
            hideMissingValues={!expanded}
            showTrend={expanded && register.address === SystemReg.Reading}
        />)}
    </AutoGrid>
}
