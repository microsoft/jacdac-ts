import React, { Fragment } from "react";
import { Link } from 'gatsby-theme-material-ui';
import { serviceSpecificationFromName, isRegister, isEvent, isCommand, isPipeReport, isReportOf, isPipeReportOf } from "../../../src/dom/spec"
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
    const registers = node.packets.filter(isRegister)
    const events = node.packets.filter(isEvent)
    const commands = node.packets.filter(isCommand)
    const reports = node.packets.filter(r => r.secondary)
    const pipeReports = node.packets.filter(isPipeReport)
    const others = node.packets.filter(r => registers.indexOf(r) < 0
        && events.indexOf(r) < 0
        && commands.indexOf(r) < 0
        && reports.indexOf(r) < 0
        && pipeReports.indexOf(r) < 0
    )

    const reportOf = (pkt: jdspec.PacketInfo) => reports.find(rep => isReportOf(pkt, rep))
    const pipeReportOf = (pkt: jdspec.PacketInfo) => pipeReports.find(rep => isPipeReportOf(pkt, rep))

    return (<Fragment key={`servicespec${node.shortId}`}>
        <h1 key="title">{node.name}
            <span style={{ marginLeft: "1rem" }}><IDChip id={node.classIdentifier} /></span>
        </h1>
        <Markdown key="notesshort" source={node.notes.short} />
        {!!node.extends?.length &&
            <p key="extends">
                <span>Extends </span>
                {node.extends.map((extend, i) => <Fragment key={`extend${extend}`}>
                    {i > 0 && <span>, </span>}
                    <Link key={`extend${extend}`} to={`/services/${extend}`}>{serviceSpecificationFromName(extend).name}</Link>
                </Fragment>)}
    .
    </p>}
        <Markdown key="noteslong" source={node.notes.long || ""} />
        <EnumSpecification key="enums" serviceClass={node.classIdentifier} />
        {[
            { name: "Registers", packets: registers, note: node.notes["registers"] },
            { name: "Events", packets: events, note: node.notes["events"] },
            { name: "Commands", packets: commands, note: node.notes["commands"] },
            { name: "Others", packets: others, note: node.notes["others"] }
        ].filter(group => group.packets.length)
            .map(group => <Fragment key={`group${group.name}`}>
                <h2>{group.name}</h2>
                {group.note && <Markdown key={`node${group.name}`} source={group.note} />}
                {group.packets
                    .map((pkt, i) => <PacketSpecification
                        key={`pkt${pkt.name}`}
                        serviceClass={node.classIdentifier}
                        packetInfo={pkt}
                        reportInfo={reportOf(pkt)}
                        pipeReportInfo={pipeReportOf(pkt)}
                    />)}
            </Fragment>)
        }
        {showSource && <Fragment key="specs">
            <h2 key="spech2">Specification</h2>
            <ServiceSpecificationSource key="source"
                classIdentifier={node.classIdentifier}
                showMarkdown={true}
                showSpecification={false}
            />
        </Fragment>}
    </Fragment>
    )
}