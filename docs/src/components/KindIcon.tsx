import React from "react"
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import CreateIcon from '@material-ui/icons/Create';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import LockIcon from '@material-ui/icons/Lock';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import CallToActionIcon from '@material-ui/icons/CallToAction';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import FlashOnIcon from '@material-ui/icons/FlashOn';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import DataUsageIcon from '@material-ui/icons/DataUsage';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ReplyIcon from '@material-ui/icons/Reply';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import DeviceUnknownIcon from '@material-ui/icons/DeviceUnknown';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import DeviceHubIcon from '@material-ui/icons/DeviceHub';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import DockIcon from '@material-ui/icons/Dock';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import BubbleChartIcon from '@material-ui/icons/BubbleChart';

export default function KindIcon(props: { kind: string, className?: string }) {
    const { kind, className } = props
    switch (kind) {
        case "ro": return <DataUsageIcon className={className} />;
        case "rw": return <CreateIcon className={className} />;
        case "const": return <LockIcon className={className} />;
        case "command": return <CallToActionIcon className={className} />;
        case "event": return <FlashOnIcon className={className} />;
        case "report": return <ReplyIcon className={className} />;
        case "bus": return <DeviceHubIcon className={className} />;
        case "device": return <DockIcon className={className} />;
        case "service": return <BubbleChartIcon className={className} />
    }
    return <DeviceUnknownIcon className={className} />;
}

export function kindName(kind: string) {
    switch (kind) {
        case "ro": return "read-only";
        case "rw": return "read-write";
        default: return kind
    }
}

export function allKinds() {
    return ["rw", "ro", "const", "event", "command", "report"]
}
