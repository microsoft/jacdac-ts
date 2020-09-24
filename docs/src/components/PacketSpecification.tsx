import { isRegister, isEvent, isCommand, tryParseMemberValue } from "../../../src/dom/spec"
// tslint:disable-next-line: no-submodule-imports
import Alert from '@material-ui/lab/Alert';
import React, { useState } from "react";
// tslint:disable-next-line: no-submodule-imports
import Chip from '@material-ui/core/Chip';
import DeviceList from "./DeviceList";
import { makeStyles, createStyles, TextField } from "@material-ui/core";
import IDChip from "./IDChip";
import KindChip from "./KindChip";
import PacketMembersChip from "./PacketMembersChip";
import Markdown from "./Markdown";
import { prettyUnit } from "../../../src/dom/pretty";

const useStyles = makeStyles((theme) => createStyles({
    root: {
        marginBottom: theme.spacing(1)
    },
    field: {
        verticalAlign: "middle"
    },
    chip: {
        margin: theme.spacing(0.5),
    },
}),
);

function isSet(field: any) {
    return field !== null && field !== undefined
}

function MemberType(props: { member: jdspec.PacketMember, setArg?: (arg: any) => void }) {
    const { member, setArg } = props;
    const [value, setValue] = useState("")
    const [error, setError] = useState(false)
    const classes = useStyles()
    const name = member.name !== "_" && member.name
    const parts: string[] = [
        prettyUnit(member.unit),
        isSet(member.typicalMin) && `[${member.typicalMin}, ${member.typicalMax}]`,
        isSet(member.absoluteMin) && `absolute [${member.absoluteMin}, ${member.absoluteMin}]`,
    ].filter(f => isSet(f) && f)

    const handleChange = (ev) => {
        const newValue = ev.target.value
        setValue(newValue)
        const r = tryParseMemberValue(newValue, member)
        setArg(r.error ? undefined : r.value)
        setError(!!r.error)
    }

    if (setArg)
        return <li>
            <TextField
                className={classes.field}
                size="small"
                label={name}
                helperText={[member.type, ...parts].join(', ')}
                value={value}
                onChange={handleChange}
                error={error}
            />
        </li>
    else
        return <li>
            {name && <code>{name}{":"}</code>}
            <code>{member.type}</code>
            {parts.join(', ')}
            {member.startRepeats && <strong>starts repeating</strong>}
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
    pipeReportInfo?: jdspec.PacketInfo
}) {
    const { serviceClass, packetInfo, reportInfo, pipeReportInfo } = props;
    const [args, setArgs] = useState<any[]>([])
    const classes = useStyles();
    if (!packetInfo)
        return <Alert severity="error">{`Unknown register ${serviceClass.toString(16)}:${packetInfo.identifier}`}</Alert>

    const setArg = (index: number) => (arg: any) => {
        const c = args.slice(0)
        c[index] = arg;
        setArgs(c)
    }

    return <div className={classes.root}>
        <h3 id={`${packetInfo.kind}:${packetInfo.identifier}`}>{packetInfo.name}
            <PacketMembersChip className={classes.chip} members={packetInfo.fields} />
            <IDChip className={classes.chip} id={packetInfo.identifier} />
            <KindChip className={classes.chip} kind={packetInfo.kind} />
            {packetInfo.optional && <Chip className={classes.chip} size="small" label="optional" />}
            {packetInfo.derived && <Chip className={classes.chip} size="small" label="derived" />}
        </h3>
        <Markdown source={packetInfo.description} />
        {!!packetInfo.fields.length && <MembersType members={packetInfo.fields} title="Arguments" setArg={setArg} />}
        {!!reportInfo && <MembersType members={reportInfo.fields} title="Report" />}
        {!!pipeReportInfo && <MembersType members={pipeReportInfo.fields} title="Pipe report" />}
        {isCommand(packetInfo) && <DeviceList serviceClass={serviceClass} showDeviceName={true} commandIdentifier={packetInfo.identifier} />}
        {isRegister(packetInfo) && <DeviceList serviceClass={serviceClass} showDeviceName={true} registerIdentifier={packetInfo.identifier} />}
        {isEvent(packetInfo) && <DeviceList serviceClass={serviceClass} showDeviceName={true} eventIdentifier={packetInfo.identifier} />}
    </div>
}