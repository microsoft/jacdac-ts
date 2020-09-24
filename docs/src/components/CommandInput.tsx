import React, { useState } from "react";
import { Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, MenuItem, Select, Switch, TextField, Typography } from "@material-ui/core";
import { JDService } from "../../../src/dom/service";
import { Button } from "gatsby-theme-material-ui";
import DeviceName from "./DeviceName";
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import ErrorIcon from '@material-ui/icons/Error';
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import CheckIcon from '@material-ui/icons/Check';
import { delay } from "../../../src/dom/utils";
import { packArguments } from "../../../src/dom/spec"
import Packet from "../../../src/dom/packet";

export default function CommandInput(props: { service: JDService, command: jdspec.PacketInfo, showDeviceName?: boolean, args?: any[] }) {
    const { service, command, showDeviceName, args } = props;
    const [working, setWorking] = useState(false)
    const [error, setError] = useState(undefined)
    const [ack, setAck] = useState<boolean>(false)

    const missingArguments = !!args && (!args.length || args.some(arg => arg === undefined))
    const disabled = working || missingArguments;
    const handleClick = async () => {
        try {
            setWorking(true)
            setError(undefined)
            setAck(false)
            // TODO encode args
            const pkt = !args?.length ? Packet.onlyHeader(command.identifier)
                : packArguments(command, args)
            await service.sendPacketAsync(pkt, true)
            setAck(true)
            // expire hack
            delay(1500)
                .then(() => setAck(false))
        } catch (e) {
            setError(e)
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