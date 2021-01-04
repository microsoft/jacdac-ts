import React from "react";
import { JDService } from "../../../src/jdom/service";
import { isRegister } from "../../../src/jdom/spec";
import RegisterInput from "./RegisterInput";
import useChange from '../jacdac/useChange';

export default function ServiceRegisters(props: {
    service: JDService,
    showConst?: boolean,
    showRw?: boolean,
    registerIdentifier?: number,
    showRegisterName?: boolean
}) {
    const { service, showConst, showRw, registerIdentifier, showRegisterName } = props;
    const spec = service.specification;
    const packets = spec.packets;
    const registers = packets.filter(isRegister);
    const reports = registerIdentifier !== undefined ? registers.filter(reg => reg.identifier === registerIdentifier)
        : registers.filter(reg => reg.kind == "ro" || (showConst && reg.kind == "const") || (showRw && reg.kind == "rw"));
    useChange(service)

    return <React.Fragment>
        {reports.map(report => <RegisterInput key={`register${report.identifier}`}
            register={service.register(report.identifier)}
            showRegisterName={showRegisterName} />)}
    </React.Fragment>
}