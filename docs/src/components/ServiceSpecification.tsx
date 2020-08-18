import React, { Fragment } from "react";
import { Link } from 'gatsby-theme-material-ui';
import { serviceSpecificationFromName } from "../../../src/dom/spec"
import PacketSpecification from "../components/PacketSpecification"
import IDChip from "./IDChip";
import ServiceSpecificationSource from "./ServiceSpecificationSource"
import Markdown from "./Markdown";
import EnumSpecification from "./EnumSpecification";

export default function ServiceSpecification(props: {
    service: jdspec.ServiceSpec,
    showSource?: boolean
}) {
    const { service: node, showSource } = props;
    return (<>
        <h1>{node.name}
            <span style={{ marginLeft: "1rem" }}><IDChip id={node.classIdentifier} /></span>
        </h1>
        <Markdown source={node.notes.short} />
        <Markdown source={node.notes.long || ""} />
        {!!node.extends?.length &&
            <p>
                <span>Extends </span>
                {node.extends.map(extend => <Link to={`/services/${extend}`}>{serviceSpecificationFromName(extend).name}</Link>)}
    .
    </p>}
        <EnumSpecification serviceClass={node.classIdentifier} />
        <h2>Packets</h2>
        {node.packets
            .map(pkt => <PacketSpecification serviceClass={node.classIdentifier} packetInfo={pkt} />)}
        {showSource && <>
            <h2>Specification</h2>
            <ServiceSpecificationSource classIdentifier={node.classIdentifier} />
        </>}
    </>
    )
}