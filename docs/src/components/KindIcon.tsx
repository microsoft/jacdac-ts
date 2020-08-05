import React from "react"
// tslint:disable-next-line: no-submodule-imports
import CreateIcon from '@material-ui/icons/Create';
// tslint:disable-next-line: no-submodule-imports
import LockIcon from '@material-ui/icons/Lock';
// tslint:disable-next-line: no-submodule-imports
import CallToActionIcon from '@material-ui/icons/CallToAction';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import FlashOnIcon from '@material-ui/icons/FlashOn';
import DataUsageIcon from '@material-ui/icons/DataUsage';
import AnnouncementIcon from '@material-ui/icons/Announcement';

export default function KindIcon(props: { kind: string }) {
    switch (props.kind) {
        case "ro": return <DataUsageIcon />;
        case "rw": return <CreateIcon />;
        case "const": return <LockIcon />;
        case "command": return <CallToActionIcon />;
        case "event": return <FlashOnIcon />;
        case "announce": return <AnnouncementIcon />;
    }
    console.error(`unknown ${props.kind}`)
    return undefined;
}

export function kindName(kind: string) {
    switch(kind) {
        case "ro": return "read-only";
        case "rw": return "read-write";
        default: return kind
    }
}

export function allKinds() {
    return ["rw", "ro", "const", "event", "command", "announce"]
}