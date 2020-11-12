import React from "react";
// tslint:disable-next-line: no-submodule-imports
import Chip from '@material-ui/core/Chip';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import CategoryIcon from '@material-ui/icons/Category';
import { prettyUnit } from "../../../src/jdom/pretty";
import { Tooltip } from "@material-ui/core";
import { resolveUnit } from '../../../jacdac-spec/spectool/jdspec'

export default function PacketMembersChip(props: { members: jdspec.PacketMember[], className?: string }) {
    const { members, className } = props;
    if (!members?.length)
        return null

    const label = members.map(member => `${member.type} ${prettyUnit(member.unit)}`).join(', ');
    const title = members.map(member => `${resolveUnit(member.unit)?.name || ""}`).join(',\n');
    return <Tooltip title={title}>
        <span>
            <Chip className={className} size="small" icon={<CategoryIcon />} label={label} />
        </span>
    </Tooltip>
}
