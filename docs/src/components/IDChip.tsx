import React from "react"
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import FingerprintIcon from '@material-ui/icons/Fingerprint';
import { Chip } from '@material-ui/core';

export default function IDChip(props: { id: number | string, className?: string }) {
    const { id, className } = props
    const ids = typeof id === "string" ? id : `0x${id !== undefined ? (id as number).toString(16) : "???"}`
    return <Chip className={className} size="small" icon={<FingerprintIcon />} title={`identifier ${ids}`} label={ids} />
}