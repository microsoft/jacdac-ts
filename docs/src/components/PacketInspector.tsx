import React, { useContext } from "react"
import Alert from "./Alert"
import PacketsContext from "./PacketsContext";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import HistoryIcon from '@material-ui/icons/History';
import KindChip from "./KindChip"
import { toHex } from "../../../src/dom/utils";
import { createStyles, makeStyles, Paper, Typography } from "@material-ui/core";
import PacketSpecification from "./PacketSpecification";
import { printPacket } from "../../../src/dom/pretty";

export default function PacketInspector() {
    const { selectedPacket: packet } = useContext(PacketsContext);

    if (!packet)
        return <Alert severity="info">Click on a packet in the <HistoryIcon /> packet list.</Alert>

    const { decoded } = packet;
    const info = decoded?.info;

    return <>
        <h2>{`${packet.friendlyCommandName} ${packet.is_command ? "to" : "from"} ${packet.friendlyDeviceName}/${packet.friendlyServiceName}`}</h2>
        <p>
            {packet.timestamp}ms, <KindChip kind={decoded?.info?.kind} />, size {packet.size}
        </p>
        {info && <PacketSpecification
            serviceClass={packet.service_class}
            packetInfo={info}
        />}
        <h3>Raw Data</h3>
        <p>
            {printPacket(packet)}
        </p>
        <Paper>
            <pre>
                {`${toHex(packet.header)}
${toHex(packet.data)}`}
            </pre>
        </Paper>
    </>;
}