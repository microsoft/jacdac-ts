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
        <h1 key="title">{node.name}
            <span style={{ marginLeft: "1rem" }}><IDChip id={node.classIdentifier} /></span>
        </h1>
        <Markdown key="notesshort" source={node.notes.short} />
        {!!node.extends?.length &&
            <p key="extends">
                <span>Extends </span>
                {node.extends.map(extend => <Link key={`extend${extend}`} to={`/services/${extend}`}>{serviceSpecificationFromName(extend).name}</Link>)}
    .
    </p>}
        <Markdown key="noteslong" source={node.notes.long || ""} />
        <EnumSpecification key="enums" serviceClass={node.classIdentifier} />
        <h2>Packets</h2>
        {node.packets
            .map((pkt, i) => <PacketSpecification key={`pkt${pkt.name}`} serviceClass={node.classIdentifier} packetInfo={pkt} />)}
        {showSource && <>
            <h2 key="spech2">Specification</h2>
            <ServiceSpecificationSource key="source" classIdentifier={node.classIdentifier} />
        </>}
    </>
    )
}