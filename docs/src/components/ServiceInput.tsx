import React, { useEffect, useContext } from "react";
import { JDService } from "../../../src/dom/service";
import { isRegister } from "../../../src/dom/spec";
import { setStreamingAsync } from "../../../src/dom/sensor"
import RegisterInput from "./RegisterInput";
import { CHANGE } from "../../../src/dom/constants";
import JacdacContext from '../../../src/react/Context';
import { BusState } from "../../../src/dom/bus";

export default function ServiceInput(props: { service: JDService, showConst?: boolean, showRw?: boolean, registerAddress?: number, showRegisterName?: boolean }) {
    const { connectionState } = useContext(JacdacContext)
    const { service, showConst, showRw, registerAddress, showRegisterName } = props;
    const spec = service.specification;
    const packets = spec.packets;
    const registers = packets.filter(isRegister);
    const reports = registerAddress !== undefined ? registers.filter(reg => reg.identifier === registerAddress)
        : registers.filter(reg => reg.kind == "ro" || (showConst && reg.kind == "const") || (showRw && reg.kind == "rw"));

    useEffect(() => {
        if (connectionState == BusState.Connected)
            setStreamingAsync(service, true)
        return service.subscribe(CHANGE, () => {
            if (connectionState == BusState.Connected)
                setStreamingAsync(service, true)
        })
    }, [connectionState, service]);

    return <React.Fragment>
        {reports.map(report => <RegisterInput register={service.register(report.identifier)} showName={showRegisterName} showMemberName={true} />)}
    </React.Fragment>
}