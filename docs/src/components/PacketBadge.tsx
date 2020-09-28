import { Badge } from "@material-ui/core";
import React from "react";
import Packet from "../../../src/dom/packet";
import KindIcon from "./KindIcon";

export default function PacketBadge(props: { packet: Packet, count?: number }) {
    const { packet, count } = props;
    const { decoded } = packet;

    return (count || 0) > 1 ? <Badge badgeContent={count}>
        <KindIcon kind={decoded?.info.kind} />
    </Badge> : <KindIcon kind={decoded?.info.kind} />
}