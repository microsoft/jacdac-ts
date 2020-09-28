import React, { useEffect, useContext } from "react";
import { JDService } from "../../../src/dom/service";
import { isRegister } from "../../../src/dom/spec";
import RegisterInput from "./RegisterInput";
import useChange from '../jacdac/useChange';
import { startStreaming } from "../../../src/dom/sensor";

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
    useEffect(() => startStreaming(service))

    return <React.Fragment>
        {reports.map(report => <RegisterInput key={`register${report.identifier}`} register={service.register(report.identifier)} showName={showRegisterName} showMemberName={true} />)}
    </React.Fragment>
}