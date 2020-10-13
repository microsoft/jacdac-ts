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
        <div>
            {packet.timestamp}ms, <KindChip kind={info?.kind} />, size {packet.size}
        </div>
        { decoded && <>
            <h3>Arguments</h3><ul>
                {decoded.decoded.map((member, i) => <li key={i}>
                    {member.info.name}: <code>{member.humanValue}</code>
                </li>)}
            </ul>
        </>}
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
        {info && <><h3>Specification</h3>
            <PacketSpecification
                serviceClass={packet.service_class}
                packetInfo={info}
            /></>}
    </>;
}