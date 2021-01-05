import React from "react";
import { JDService } from "../../../src/jdom/service";
import { isRegister } from "../../../src/jdom/spec";
import RegisterInput from "./RegisterInput";
import useChange from '../jacdac/useChange';
import AutoGrid from "./ui/AutoGrid";

export default function ServiceRegisters(props: {
    service: JDService,
    showConst?: boolean,
    showRw?: boolean,
    registerIdentifiers?: number[],
    showRegisterName?: boolean
}) {
    const { service, showConst, showRw, registerIdentifiers, showRegisterName } = props;
    const spec = service.specification;
    const packets = spec.packets;
    const registers = packets.filter(isRegister);
    const reports = registerIdentifiers !== undefined ? registers.filter(reg => registerIdentifiers.indexOf(reg.identifier) > -1)
        : registers.filter(reg => reg.kind == "ro" || (showConst && reg.kind == "const") || (showRw && reg.kind == "rw"));
    useChange(service)

    return <AutoGrid spacing={1}>
        {reports.map(report => <RegisterInput key={`${report.kind}${report.identifier}`}
            register={service.register(report.identifier)}
            showRegisterName={showRegisterName} />)}
    </AutoGrid>
}