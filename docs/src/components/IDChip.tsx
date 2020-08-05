import React from "react"
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import FingerprintIcon from '@material-ui/icons/Fingerprint';
import { Chip } from '@material-ui/core';

export default function IDChip(props: { id: number }) {
    const { id } = props
    const ids = `0x${id.toString(16)}`
    return <Chip size="small" icon={<FingerprintIcon />} title={`identifier ${ids} (${id})`} label={ids} />
}