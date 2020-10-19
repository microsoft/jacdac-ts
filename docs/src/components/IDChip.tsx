import React, { useContext } from "react"
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import FingerprintIcon from '@material-ui/icons/Fingerprint';
import { Chip, Tooltip } from '@material-ui/core';
import PacketsContext from "./PacketsContext";
import AppContext, { DrawerType } from "./AppContext";

export default function IDChip(props: { id: number | string, className?: string, filter?: string }) {
    const { id, className, filter } = props
    const { filter: packetFilter, setFilter: setPacketFilter } = useContext(PacketsContext);
    const { setDrawerType } = useContext(AppContext)

    const ids = typeof id === "string" ? id : `0x${id !== undefined ? (id as number).toString(16) : "???"}`
    const filtered = packetFilter && packetFilter.indexOf(filter) > -1
    const handleClick = () => {
        if (filtered)
            setPacketFilter(packetFilter?.replace(filter, '')?.trim())
        else
            setPacketFilter(packetFilter?.trim() + ' ' + filter)
        setDrawerType(DrawerType.Packets)
    }

    return <Tooltip title={filtered ? `remove filter ${filter}` : `add filter ${filter}`}>
        <span>
            <Chip onClick={!!filter && handleClick} className={className} size="small" icon={<FingerprintIcon />} title={`identifier ${ids}`} label={ids} />
        </span>
    </Tooltip>
}