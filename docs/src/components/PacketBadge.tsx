import { Badge } from "@material-ui/core";
import React from "react";
import { SRV_LOGGER } from "../../../jacdac-spec/dist/specconstants";
import Packet from "../../../src/jdom/packet";
import KindIcon from "./KindIcon";
import LogMessageIcon from "./LogMessageIcon";

export default function PacketBadge(props: { packet: Packet, count?: number }) {
    const { packet, count } = props;
    const { decoded } = packet;

    const logMessage = packet.service_class === SRV_LOGGER && packet.is_report;

    const icon = logMessage ? <LogMessageIcon identifier={decoded?.info.identifier} /> : <KindIcon kind={decoded?.info.kind} />;
    return (count || 0) > 1 ? <Badge badgeContent={count}>
        {icon}
    </Badge> : icon;
}