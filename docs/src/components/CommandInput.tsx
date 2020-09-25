import React, { useContext, useState } from "react";
import { Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, MenuItem, Select, Switch, TextField, Typography } from "@material-ui/core";
import { InPipeReader } from "../../../src/dom/pipes";
import { JDService } from "../../../src/dom/service";
import DeviceName from "./DeviceName";
import { hasPipeReport, isReportOf, packArguments } from "../../../src/dom/spec"
import { DecodedPacket, decodePacketData } from "../../../src/dom/pretty"
import Packet from "../../../src/dom/packet";
import JACDACContext, { JDContextProps } from "../../../src/react/Context"
import CmdButton from "./CmdButton";

export default function CommandInput(props: {
    service: JDService,
    command: jdspec.PacketInfo,
    showDeviceName?: boolean,
    args?: any[],
    setReports?: (reports: DecodedPacket[]) => void
}) {
    const { service, command, showDeviceName, args, setReports } = props;
    const { bus } = useContext<JDContextProps>(JACDACContext)

    const { specification } = service;
    const requiredArgLength = command.fields.length - (hasPipeReport(command) ? 1 : 0);
    const missingArguments = (args?.length || 0) !== requiredArgLength;
    const disabled = missingArguments;
    const reportSpec = command.hasReport && specification.packets.find(p => isReportOf(command, p))
    const handleClick = async () => {
        const pkt = !args?.length ? Packet.onlyHeader(command.identifier)
            : packArguments(command, args)
        if (setReports && reportSpec) {
            const reportPacket = await service.sendCmdAwaitResponseAsync(pkt)
            const decoded = decodePacketData(reportPacket)
            setReports([decoded])
        } else if (setReports && hasPipeReport(command)) {
            let inp: InPipeReader;
            try {
                inp = new InPipeReader(bus);
                await service.sendPacketAsync(
                    inp.openCommand(command.identifier),
                    true)
                const { output } = await inp.readAll()
                console.log("pipe response", output)
                const reports = output.filter(ot => !!ot.data?.length).map(ot => decodePacketData(ot));
                console.log("pipe decoded", reports)
                setReports(reports)
            }
            finally {
                inp?.unmount();
            }
        }
        else
            await service.sendPacketAsync(pkt, true)
    }

    return <>
        <CmdButton key="button" variant="contained" disabled={disabled}
            onClick={handleClick}>
            {showDeviceName && <Typography>
                <DeviceName device={service.device} />/
        </Typography>}
            {command.name}
        </CmdButton>
    </>
}