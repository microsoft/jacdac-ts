import React, { useContext, useState } from "react";
import { Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, MenuItem, Select, Switch, TextField, Typography } from "@material-ui/core";
import { InPipeReader } from "../../../src/dom/pipes";
import { JDService } from "../../../src/dom/service";
import { Button } from "gatsby-theme-material-ui";
import DeviceName from "./DeviceName";
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import ErrorIcon from '@material-ui/icons/Error';
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import CheckIcon from '@material-ui/icons/Check';
import { delay } from "../../../src/dom/utils";
import { hasPipeReport, isReportOf, packArguments } from "../../../src/dom/spec"
import { DecodedPacket, decodePacketData } from "../../../src/dom/pretty"
import Packet from "../../../src/dom/packet";
import AppContext from "./AppContext";
import JACDACContext, { JDContextProps } from "../../../src/react/Context"

const ACK_RESET_DELAY = 1000
const ERROR_RESET_DELAY = 3000

export default function CommandInput(props: {
    service: JDService,
    command: jdspec.PacketInfo,
    showDeviceName?: boolean,
    args?: any[],
    setReports?: (reports: DecodedPacket[]) => void
}) {
    const { service, command, showDeviceName, args, setReports } = props;
    const { setError: setAppError } = useContext(AppContext)
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const [working, setWorking] = useState(false)
    const [error, setError] = useState(undefined)
    const [ack, setAck] = useState<boolean>(false)

    const { specification } = service;
    const requiredArgLength = command.fields.length - (hasPipeReport(command) ? 1 : 0);
    const missingArguments = (args?.length || 0) !== requiredArgLength;
    const disabled = working || missingArguments || ack || error;
    const reportSpec = command.hasReport && specification.packets.find(p => isReportOf(command, p))
    const handleClick = async () => {
        try {
            setWorking(true)
            setError(undefined)
            setReports(undefined)
            setAck(false)
            // TODO encode args
            console.log(args)
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
            setAck(true)
            // expire hack
            delay(ACK_RESET_DELAY)
                .then(() => setAck(false))
        } catch (e) {
            setError(e)
            setAppError(e)
            console.log(e)
            // expire error
            delay(ERROR_RESET_DELAY)
                .then(() => setError(undefined))
        } finally {
            setWorking(false)
        }
    }

    return <>
        <Button key="button" variant="contained"
            disabled={disabled}
            endIcon={error ? <ErrorIcon /> : ack ? <CheckIcon /> : undefined}
            onClick={handleClick}>
            {showDeviceName && <Typography>
                <DeviceName device={service.device} />/
        </Typography>}
            {command.name}
            {working && <CircularProgress size="small" />}
        </Button>
    </>
}