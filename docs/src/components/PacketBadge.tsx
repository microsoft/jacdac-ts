import { Badge } from "@material-ui/core";
import React from "react";
import { SRV_LOGGER } from "../../../jacdac-spec/dist/specconstants";
import Packet from "../../../src/jdom/packet";
import KindIcon from "./KindIcon";
import LogMessageIcon from "./LogMessageIcon";
import ArrowLeftIcon from '@material-ui/icons/ArrowLeft';
import ArrowRightIcon from '@material-ui/icons/ArrowRight';
import ClearIcon from '@material-ui/icons/Clear';
import { CRC_ACK_NODE_NAME, META_ACK, META_ACK_FAILED, META_GET } from "../../../src/jdom/constants";
import CodeIcon from '@material-ui/icons/Code';
import Tooltip from "./ui/Tooltip";

export default function PacketBadge(props: {
    packet: Packet, count?: number,
}) {
    const { packet, count } = props;
    const { decoded } = packet;
    const requiredAck = !!packet.requiresAck;
    const failedAck = !!packet.meta[META_ACK_FAILED];
    const receivedAck = !failedAck && !!packet.meta[META_ACK];
    const getPacket = !!packet.meta[META_GET];
    const direction = packet.isCommand ? "to" : "from";
    const logMessage = packet.serviceClass === SRV_LOGGER && packet.isReport
        && !packet.isRegisterGet;

    return <Badge badgeContent={count}>
        {getPacket && !failedAck && !receivedAck && <Tooltip title={`to/from ${packet.friendlyDeviceName}`}><span><CodeIcon /></span></Tooltip>}
        {direction === "to" && !getPacket && !failedAck && !receivedAck && <Tooltip title={`to ${packet.friendlyDeviceName}`}><span><ArrowLeftIcon /></span></Tooltip>}
        {direction === "from" && !getPacket && !failedAck && !receivedAck && <Tooltip title={`from ${packet.friendlyDeviceName}`}><span><ArrowRightIcon /></span></Tooltip>}
        {requiredAck === true && failedAck && <Tooltip title="no ack"><span><ClearIcon /></span></Tooltip>}
        {requiredAck === true && receivedAck && <Tooltip title="ack received"><span><KindIcon kind={CRC_ACK_NODE_NAME} /></span></Tooltip>}
        {logMessage ? <LogMessageIcon identifier={decoded?.info.identifier} /> :
            <KindIcon kind={packet.isCRCAck ? "crc_ack"
                : packet.isPipe ? "pipe"
                    : packet.isAnnounce ? "announce"
                        : decoded?.info.kind} />}
    </Badge>
}