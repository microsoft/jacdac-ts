import { List } from "@material-ui/core";
import React from "react"
import Trace from "../../../src/jdom/trace"
import PacketListItem from "./PacketListItem"

export default function TraceView(props: { trace: Trace }) {
    const { trace } = props;
    const { packets } = trace;
    return <List>
        {packets.map(packet => <PacketListItem
            key={'pkt' + packet.key}
            packet={packet}
            count={1}
            skipRepeatedAnnounce={true}
            showTime={true} />
        )}
    </List>
}