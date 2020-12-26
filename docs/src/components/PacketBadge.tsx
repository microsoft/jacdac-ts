import { Badge } from "@material-ui/core";
import React from "react";
import { SRV_LOGGER } from "../../../jacdac-spec/dist/specconstants";
import Packet from "../../../src/jdom/packet";
import KindIcon from "./KindIcon";
import LogMessageIcon from "./LogMessageIcon";
import ArrowLeftIcon from '@material-ui/icons/ArrowLeft';
import ArrowRightIcon from '@material-ui/icons/ArrowRight';
import DoneIcon from '@material-ui/icons/Done';

export default function PacketBadge(props: {
    packet: Packet, count?: number,
    direction?: "from" | "to",
    requiredAck?: boolean,
    receivedAck?: boolean
}) {
    const { packet, count, direction, requiredAck, receivedAck } = props;
    const { decoded } = packet;

    const logMessage = packet.service_class === SRV_LOGGER && packet.isReport
        && !packet.isRegisterGet;
    const icon = logMessage ? <LogMessageIcon identifier={decoded?.info.identifier} /> :
        <KindIcon kind={packet.isCRCAck ? "crc_ack"
            : packet.isPipe ? "pipe"
                : packet.isAnnounce ? "announce"
                    : decoded?.info.kind} />;

    const badgeIcon = <>
        {direction === "from" && !receivedAck && <ArrowRightIcon />}
        {direction === "to" && !receivedAck && <ArrowLeftIcon />}
        {requiredAck === true && receivedAck && <DoneIcon />}
        {icon}
    </>
    return (count || 0) > 1 ? <Badge badgeContent={count}>
        {badgeIcon}
    </Badge> : badgeIcon;
}