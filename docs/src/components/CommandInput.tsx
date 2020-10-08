import React, { useContext, useState } from "react";
import { Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, MenuItem, Select, Switch, TextField, Typography } from "@material-ui/core";
import { InPipeReader } from "../../../src/dom/pipes";
import { JDService } from "../../../src/dom/service";
import DeviceName from "./DeviceName";
import { hasPipeReport, isReportOf } from "../../../src/dom/spec"
import { packArguments } from "../../../src/dom/command"
import { DecodedPacket, decodePacketData, printPacket } from "../../../src/dom/pretty"
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
            const decoded = reportPacket?.decoded
            setReports([decoded])
        } else if (setReports && hasPipeReport(command)) {
            let inp: InPipeReader;
            try {
                inp = new InPipeReader(bus);
                const cmd = inp.openCommand(command.identifier);
                await service.sendPacketAsync(cmd, true)
                console.log(printPacket(cmd)) // keep this call, it sets up pretty to understand packages
                const { output } = await inp.readAll()
                const reports = output.filter(ot => !!ot.data?.length).map(ot => ot?.decoded);
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