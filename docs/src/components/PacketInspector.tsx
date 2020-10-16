import React, { useContext } from "react"
import Alert from "./Alert"
import PacketsContext from "./PacketsContext";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import HistoryIcon from '@material-ui/icons/History';
import KindChip from "./KindChip"
import { toHex } from "../../../src/dom/utils";
import { Typography } from "@material-ui/core";
import PacketSpecification from "./PacketSpecification";
import { printPacket } from "../../../src/dom/pretty";
import PacketLayout from "./PacketLayout";
import { Link } from "gatsby-theme-material-ui";
import { PaperBox } from "./PaperBox";

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
        <Typography variant="body2">
            {printPacket(packet)}
        </Typography>
        <h3><Link to="/specification#frames">Header</Link></h3>
        <PacketLayout packet={packet} showSlots={true} showFlags={true} />
        {!!packet.data.length && <>
            <h3>Data</h3>
            <PaperBox padding={0}>
                <pre>
                    {toHex(packet.data)}
                </pre>
            </PaperBox>
        </>}
        {!!decoded?.decoded.length && <>
            <h3>Arguments</h3><ul>
                {decoded.decoded.map((member, i) => <li key={i}>
                    {member.info.name == '_' ? info.name : member.info.name}: <code>{member.humanValue}</code>
                </li>)}
            </ul>
        </>}
        {info && <><h3>Specification</h3>
            <PacketSpecification
                serviceClass={packet.service_class}
                packetInfo={info}
            /></>}
    </>;
}