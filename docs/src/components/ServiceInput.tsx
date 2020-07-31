import React, { useEffect } from "react";
import { JDService } from "../../../src/dom/service";
import { isRegister } from "../../../src/dom/spec";
import { ensureStreamingSubscription } from "../../../src/dom/sensor"
import ReportRegister from "./ReportRegister";
import { REG_IS_STREAMING } from "../../../src/dom/constants";

export default function ServiceInput(props: { service: JDService }) {
    const { service } = props;
    const spec = service.specification;
    const packets = spec.packets;
    const registers = packets.filter(isRegister);
    const reports = registers.filter(reg => reg.kind == "ro")

    return <React.Fragment>
        {reports.map(report => <ReportRegister register={service.registerAt(report.identifier)} />)}
    </React.Fragment>
}