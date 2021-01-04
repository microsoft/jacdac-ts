import React, { useState } from "react"
import { DecodedPacket } from "../../../src/jdom/pretty";
import { DecodedMemberItem } from "./DecodedMemberItem";

export default function DecodedPacketItem(props: { pkt: DecodedPacket }) {
    const { pkt } = props;
    const { decoded, info, service } = pkt;
    
    return <>
        {decoded.map(member => <DecodedMemberItem serviceSpecification={service} registerSpecification={info} member={member} specification={member.info} />)}
    </>
}