import React, { useState } from "react"
import { DecodedPacket } from "../../../src/dom/pretty";
import { DecodedMemberItem } from "./DecodedMemberItem";

export default function DecodedPacketItem(props: { pkt: DecodedPacket }) {
    const { pkt } = props;
    const { decoded, info, service } = pkt;
    
    return <>
        {decoded.map(member => <DecodedMemberItem serviceSpecification={service} specification={info} member={member} />)}
    </>
}