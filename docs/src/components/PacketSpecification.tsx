import { isRegister, isEvent, isCommand, tryParseMemberValue, serviceSpecificationFromClassIdentifier } from "../../../src/jdom/spec"
// tslint:disable-next-line: no-submodule-imports
import Alert from "./ui/Alert";
import React, { useState } from "react";
// tslint:disable-next-line: no-submodule-imports
import Chip from '@material-ui/core/Chip';
import DeviceList from "./DeviceList";
import { makeStyles, createStyles, TextField } from "@material-ui/core";
import IDChip from "./IDChip";
import KindChip from "./KindChip";
import PacketMembersChip from "./PacketMembersChip";
import Markdown from "./ui/Markdown";
import { prettyMemberUnit, prettyUnit } from "../../../src/jdom/pretty";
import { isSet } from "../../../src/jdom/utils";

const useStyles = makeStyles((theme) => createStyles({
    root: {
        marginBottom: theme.spacing(1)
    },
    field: {
        "& > div": { verticalAlign: "middle" }
    },
    chip: {
        margin: theme.spacing(0.5),
    },
}),
);

function MemberType(props: { member: jdspec.PacketMember }) {
    const { member } = props;
    const classes = useStyles();
    const helperText = prettyMemberUnit(member);

    return <li className={classes.field}>
        {member.name}: <code>{helperText}</code>
    </li>
}

function MembersType(props: { members: jdspec.PacketMember[], title?: string, setArg?: (index: number) => (args: any[]) => void }) {
    const { members, title, setArg } = props;

    const member = members[0]
    if (!members?.length || (members.length == 1
        && member.name == "_"
        && !isSet(member.typicalMin)
        && !isSet(member.absoluteMin)
    )
    )
        return <></>
    return <>
        {!!title && <h4>{title}</h4>}
        <ul>
            {members.map((member, i) => <MemberType key={`member${member.name}`} member={member} setArg={setArg && setArg(i)} />)}
        </ul>
    </>
}

export default function PacketSpecification(props: {
    serviceClass: number,
    packetInfo: jdspec.PacketInfo,
    reportInfo?: jdspec.PacketInfo,
    pipeReportInfo?: jdspec.PacketInfo,
    showDevices?: boolean
}) {
    const { serviceClass, packetInfo, reportInfo, pipeReportInfo, showDevices } = props;
    const [args, setArgs] = useState<any[]>([])
    const classes = useStyles();
    if (!packetInfo)
        return <Alert severity="error">{`Unknown member ${serviceClass.toString(16)}:${packetInfo.identifier}`}</Alert>
    const { fields } = packetInfo;
    const isCmd = isCommand(packetInfo)
    const service = serviceSpecificationFromClassIdentifier(serviceClass)

    const hasArgs = isCmd && !!packetInfo.fields.length
    const setArg = (index: number) => (arg: any) => {
        const c = args.slice(0)
        c[index] = arg;
        setArgs(c)
    }

    return <div className={classes.root}>
        <h3 id={`${packetInfo.kind}:${packetInfo.identifier}`}>{packetInfo.name}
            <PacketMembersChip spec={packetInfo} className={classes.chip} members={packetInfo.fields} />
            {packetInfo.identifier !== undefined && <IDChip className={classes.chip} id={packetInfo.identifier} filter={`pkt:0x${packetInfo.identifier.toString(16)}`} />}
            <KindChip className={classes.chip} kind={packetInfo.kind} />
            {packetInfo.optional && <Chip className={classes.chip} size="small" label="optional" />}
            {packetInfo.derived && <Chip className={classes.chip} size="small" label="derived" />}
        </h3>
        <Markdown source={packetInfo.description} />
        {!!fields.length && <MembersType members={fields} title={isCmd && "Arguments"} setArg={hasArgs && setArg} />}
        {!!reportInfo && <MembersType members={reportInfo.fields} title="Report" />}
        {!!pipeReportInfo && <MembersType members={pipeReportInfo.fields} title="Pipe report" />}
        {showDevices && isCommand(packetInfo) && <DeviceList serviceClass={serviceClass} commandIdentifier={packetInfo.identifier} commandArgs={hasArgs && args} />}
        {showDevices && isRegister(packetInfo) && <DeviceList serviceClass={serviceClass} registerIdentifiers={[packetInfo.identifier]} />}
        {showDevices && isEvent(packetInfo) && <DeviceList serviceClass={serviceClass} eventIdentifiers={[packetInfo.identifier]} />}
    </div>
}