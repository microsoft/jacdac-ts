import { isRegister, isEvent, isCommand } from "../../../src/dom/spec"
// tslint:disable-next-line: no-submodule-imports
import Alert from '@material-ui/lab/Alert';
import React from "react";
// tslint:disable-next-line: no-submodule-imports
import Chip from '@material-ui/core/Chip';
import DeviceList from "./DeviceList";
import { makeStyles, createStyles } from "@material-ui/core";
import IDChip from "./IDChip";
import KindChip from "./KindChip";
import PacketMembersChip from "./PacketMembersChip";
import Markdown from "./Markdown";
import { prettyUnit } from "../../../src/dom/pretty";

const useStyles = makeStyles((theme) => createStyles({
    root: {
        marginBottom: theme.spacing(1)
    },
    chip: {
        margin: theme.spacing(0.5),
    },
}),
);

function isSet(field: any) {
    return field !== null && field !== undefined
}

function MemberType(props: { member: jdspec.PacketMember }) {
    const { member } = props;
    const parts: any = [
        prettyUnit(member.unit),
        isSet(member.typicalMin) && `[${member.typicalMin}, ${member.typicalMax}]`,
        isSet(member.absoluteMin) && `absolute [${member.absoluteMin}, ${member.absoluteMin}]`,
    ].filter(f => isSet(f) && f)

    return <li>
        {member.name !== "_" && <code>{member.name}{":"}</code>}
        <code>{member.type}</code>
        {parts.join(', ')} 
        {member.startRepeats && <strong>starts repeating</strong>}
        </li>
}

function MembersType(props: { members: jdspec.PacketMember[] }) {
    const { members } = props;

    const member = members[0]
    if (members.length == 0 || (members.length == 1
        && member.name == "_"
        && !isSet(member.typicalMin)
        && !isSet(member.absoluteMin)
    )
    )
        return <></>

    return <>
        <h4>Fields</h4>
        <ul>
            {members.map(member => <MemberType key={`member${member.name}`} member={member} />)}
        </ul>
    </>
}

export default function PacketSpecification(props: { serviceClass: number, packetInfo: jdspec.PacketInfo }) {
    const { serviceClass, packetInfo } = props;
    const classes = useStyles();
    if (!packetInfo)
        return <Alert severity="error">{`Unknown register ${serviceClass.toString(16)}:${packetInfo.identifier}`}</Alert>

    return <div className={classes.root}>
        <h3 id={`${packetInfo.kind}:${packetInfo.identifier}`}>{packetInfo.name}
            <PacketMembersChip className={classes.chip} members={packetInfo.fields} />
            <IDChip className={classes.chip} id={packetInfo.identifier} />
            <KindChip className={classes.chip} kind={packetInfo.kind} />
            {packetInfo.optional && <Chip className={classes.chip} size="small" label="optional" />}
            {packetInfo.derived && <Chip className={classes.chip} size="small" label="derived" />}
        </h3>
        <Markdown source={packetInfo.description} />
        <MembersType members={packetInfo.fields} />
        {isCommand(packetInfo) && <DeviceList serviceClass={serviceClass} showDeviceName={true} commandIdentifier={packetInfo.identifier} />}
        {isRegister(packetInfo) && <DeviceList serviceClass={serviceClass} showDeviceName={true} registerIdentifier={packetInfo.identifier} />}
        {isEvent(packetInfo) && <DeviceList serviceClass={serviceClass} showDeviceName={true} eventIdentifier={packetInfo.identifier} />}
    </div>
}