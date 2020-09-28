import React, { useContext } from "react"
import Alert from "./Alert"
import PacketsContext from "./PacketsContext";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import HistoryIcon from '@material-ui/icons/History';
import { printPacket } from "../../../src/dom/pretty";

export default function PacketInspector() {

    const { selectedPacket: packet } = useContext(PacketsContext);

    if (!packet)
        return <Alert severity="info">Click on a packet in the <HistoryIcon /> packet list.</Alert>

    const text = printPacket(packet, { showTime: true })
    return <>{text}</>;
}