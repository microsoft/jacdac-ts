import React from "react";
import { JDService } from "../../../src/jdom/service";
import { isRegister } from "../../../src/jdom/spec";
import RegisterInput from "./RegisterInput";
import useChange from '../jacdac/useChange';
import AutoGrid from "./ui/AutoGrid";

export default function ServiceRegisters(props: {
    service: JDService,
    registerIdentifiers?: number[],
    filter?: (spec: jdspec.PacketInfo) => boolean,
    showRegisterName?: boolean
}) {
    const { service, registerIdentifiers, filter, showRegisterName } = props;
    const specification = useChange(service, spec => spec.specification);
    const packets = specification?.packets;
    const ids = registerIdentifiers
        || packets
            ?.filter(pkt => isRegister(pkt) && (!filter || filter(pkt)))
            ?.map(pkt => pkt.identifier);
    const registers = ids?.map(id => service.register(id));

    return <AutoGrid spacing={1}>
        {registers.map(register => <RegisterInput key={register.id}
            register={register}
            showRegisterName={showRegisterName} />)}
    </AutoGrid>
}