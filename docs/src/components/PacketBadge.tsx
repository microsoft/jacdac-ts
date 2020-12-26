import { Badge } from "@material-ui/core";
import React from "react";
import { SRV_LOGGER } from "../../../jacdac-spec/dist/specconstants";
import Packet from "../../../src/jdom/packet";
import KindIcon from "./KindIcon";
import LogMessageIcon from "./LogMessageIcon";
import ArrowLeftIcon from '@material-ui/icons/ArrowLeft';
import ArrowRightIcon from '@material-ui/icons/ArrowRight';

export default function PacketBadge(props: { packet: Packet, count?: number, direction?: "from" | "to" }) {
    const { packet, count, direction } = props;
    const { decoded } = packet;

    const logMessage = packet.service_class === SRV_LOGGER && packet.isReport;

    const icon = logMessage ? <LogMessageIcon identifier={decoded?.info.identifier} /> :
        <KindIcon kind={packet.isCRCAck ? "crc_ack"
            : packet.isPipe ? "pipe"
                : packet.isAnnounce ? "announce"
                    : decoded?.info.kind} />;
    const badgeIcon = <>
        {direction === "from" && <ArrowRightIcon />}
        {direction === "to" && <ArrowLeftIcon />}
        {icon}
    </>
    return (count || 0) > 1 ? <Badge badgeContent={count}>
        {badgeIcon}
    </Badge> : badgeIcon;
}