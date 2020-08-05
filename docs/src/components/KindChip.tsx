import React from "react"
import { Chip } from "@material-ui/core";
import KindIcon, { kindName } from "./KindIcon";

export default function KindChip(props: { kind: string, className?: string }) {
    const { kind, className } = props;
    const icon = KindIcon({ kind })
    return <Chip className={className} size="small" label={kindName(kind)} icon={icon} />
}