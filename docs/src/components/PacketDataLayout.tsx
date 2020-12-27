import { Tooltip } from "@material-ui/core";
import React from "react";
import Packet from "../../../src/jdom/packet";
import { toHex } from "../../../src/jdom/utils";
import PaperBox from "./PaperBox";

export default function PacketDataLayout(props: { packet: Packet, showHex?: boolean, showDecoded?: boolean }) {
    const { packet, showHex, showDecoded } = props;
    const { data, decoded } = packet;
    const info = decoded?.info;
    return <>
        {showHex && !!data.length && <PaperBox padding={0}>
            <Tooltip title={decoded?.info?.packFormat || "unknown data layout"}>
                <pre>
                    {toHex(data)}
                </pre>
            </Tooltip>
        </PaperBox>}
        {showDecoded && !!decoded?.decoded.length && <ul>
            {decoded.decoded.map((member, i) => <li key={i}>
                {member.info.name == '_' ? info.name : member.info.name}: <code>{member.humanValue}</code>
            </li>)}
        </ul>}
    </>
}