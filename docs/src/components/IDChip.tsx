import React from "react"
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import FingerprintIcon from '@material-ui/icons/Fingerprint';
import { Chip } from '@material-ui/core';

export default function IDChip(props: { id: number, className?: string }) {
    const { id, className } = props
    const ids = `0x${id !== undefined ? id.toString(16) : "???"}`
    return <Chip className={className} size="small" icon={<FingerprintIcon />} title={`identifier ${ids}`} label={ids} />
}