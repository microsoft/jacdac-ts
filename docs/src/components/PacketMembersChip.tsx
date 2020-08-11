import React from "react";
// tslint:disable-next-line: no-submodule-imports
import Chip from '@material-ui/core/Chip';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import CategoryIcon from '@material-ui/icons/Category';
import { prettyUnit } from "../../../src/dom/pretty";

export default function PacketMembersChip(props: { members: jdspec.PacketMember[], className?: string }) {
    const { members, className } = props;
    if (!members.length) {
        return <></>
    }

    if (members?.length === 1) {
        const member = members[0]
        const label = `${member.type}${prettyUnit(member.unit)}`
        return <Chip className={className} size="small" icon={<CategoryIcon />} label={label} />
    }
    return <></>
}
