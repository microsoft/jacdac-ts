import React, { useContext } from "react"
import Alert from "./Alert"
import PacketsContext from "./PacketsContext";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import HistoryIcon from '@material-ui/icons/History';
import KindChip from "./KindChip"
import { toHex } from "../../../src/jdom/utils";
import { Tooltip, Typography } from "@material-ui/core";
import PacketSpecification from "./PacketSpecification";
import { printPacket } from "../../../src/jdom/pretty";
import PacketHeaderLayout from "./PacketHeaderLayout";
import { Link } from "gatsby-theme-material-ui";
import PaperBox from "./PaperBox";
import { META_ACK } from "../../../src/jdom/constants";
import Packet from "../../../src/jdom/packet";
import PacketBadge from "./PacketBadge";

export default function PacketInspector() {
    const { selectedPacket: packet } = useContext(PacketsContext);

    if (!packet)
        return <Alert severity="info">Click on a packet in the <HistoryIcon /> packet list.</Alert>

    const { decoded, data } = packet;
    const info = decoded?.info;
    const ack = packet.meta[META_ACK] as Packet;

    return <>
        <h2>
            <PacketBadge packet={packet} />
            {`${packet.friendlyCommandName} ${packet.isCommand ? "to" : "from"} ${packet.friendlyDeviceName}/${packet.friendlyServiceName}`}</h2>
        <div>
            {packet.timestamp}ms, <KindChip kind={info?.kind} />, size {packet.size}
        </div>
        <Typography variant="body2">
            {printPacket(packet)}
        </Typography>
        {packet.sender && <Typography variant="body2">
            sender: {packet.sender}
        </Typography>}
        <h3>Header</h3>
        <PacketHeaderLayout packet={packet} showSlots={true} showFlags={true} />
        {!!data.length && <>
            <h3>Data</h3>
            <PaperBox padding={0}>
                <Tooltip title={decoded?.info?.packFormat || "unknown data layout"}>
                    <pre>
                        {toHex(data)}
                    </pre>
                </Tooltip>
            </PaperBox>
        </>}
        {!!decoded?.decoded.length && <>
            <h3>Arguments</h3><ul>
                {decoded.decoded.map((member, i) => <li key={i}>
                    {member.info.name == '_' ? info.name : member.info.name}: <code>{member.humanValue}</code>
                </li>)}
            </ul>
        </>}
        {ack && <>
            <h3>
                
                Ack received</h3>
            <PacketHeaderLayout packet={ack} />
        </>}
        {info && <><h3>Specification</h3>
            <PacketSpecification
                serviceClass={packet.service_class}
                packetInfo={info}
            /></>}
    </>;
}