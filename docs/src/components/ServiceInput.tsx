import React, { useEffect, useContext } from "react";
import { JDService } from "../../../src/dom/service";
import { isRegister } from "../../../src/dom/spec";
import { setStreamingAsync } from "../../../src/dom/sensor"
import ReportRegister from "./ReportRegister";
import { CHANGE } from "../../../src/dom/constants";
import JacdacContext from '../../../src/react/Context';
import { BusState } from "../../../src/dom/bus";

export default function ServiceInput(props: { service: JDService }) {
    const { connectionState } = useContext(JacdacContext)
    const { service } = props;
    const spec = service.specification;
    const packets = spec.packets;
    const registers = packets.filter(isRegister);
    const reports = registers.filter(reg => reg.kind == "ro")

    useEffect(() => {
        if (connectionState == BusState.Connected)
            setStreamingAsync(service, true)
        return service.subscribe(CHANGE, () => {
            if (connectionState == BusState.Connected)
                setStreamingAsync(service, true)
        })
    }, [connectionState, service])

    return <React.Fragment>
        {reports.map(report => <ReportRegister register={service.register(report.identifier)} />)}
    </React.Fragment>
}