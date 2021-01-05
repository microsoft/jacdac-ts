import { Badge, Tooltip } from "@material-ui/core";
import React from "react";
import { SRV_LOGGER } from "../../../jacdac-spec/dist/specconstants";
import Packet from "../../../src/jdom/packet";
import KindIcon from "./KindIcon";
import LogMessageIcon from "./LogMessageIcon";
import ArrowLeftIcon from '@material-ui/icons/ArrowLeft';
import ArrowRightIcon from '@material-ui/icons/ArrowRight';
import DoneIcon from '@material-ui/icons/Done';
import ClearIcon from '@material-ui/icons/Clear';
import { META_ACK, META_ACK_FAILED, META_GET } from "../../../src/jdom/constants";

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

    const logMessage = packet.service_class === SRV_LOGGER && packet.isReport
        && !packet.isRegisterGet;
    const icon = logMessage ? <LogMessageIcon identifier={decoded?.info.identifier} /> :
        <KindIcon kind={packet.isCRCAck ? "crc_ack"
            : packet.isPipe ? "pipe"
                : packet.isAnnounce ? "announce"
                    : decoded?.info.kind} />;

    const badgeIcon = <>
        {(direction === "to" || getPacket) && !failedAck && !receivedAck && <Tooltip title={`to ${packet.friendlyDeviceName}`}><ArrowLeftIcon /></Tooltip>}
        {direction === "from" && !failedAck && !receivedAck && <Tooltip title={`from ${packet.friendlyDeviceName}`}><ArrowRightIcon /></Tooltip>}
        {requiredAck === true && failedAck && <Tooltip title="no ack"><ClearIcon /></Tooltip>}
        {requiredAck === true && receivedAck && <Tooltip title="ack received"><DoneIcon /></Tooltip>}
        {icon}
    </>

    return (count || 0) > 1 ? <Badge badgeContent={count}>
        {badgeIcon}
    </Badge> : badgeIcon;
}