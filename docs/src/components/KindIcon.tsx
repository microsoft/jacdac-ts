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
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ComputerIcon from '@material-ui/icons/Computer';
import {
    PACKET_KIND_RO, PACKET_KIND_RW, CONST_NODE_NAME, COMMAND_NODE_NAME,
    REPORT_NODE_NAME, BUS_NODE_NAME, DEVICE_NODE_NAME, VIRTUAL_DEVICE_NODE_NAME,
    SERVICE_NODE_NAME, EVENT_NODE_NAME
} from "../../../src/jdom/constants";

export default function KindIcon(props: { kind: string, className?: string }) {
    const { kind, className } = props
    switch (kind) {
        case PACKET_KIND_RO: return <DataUsageIcon className={className} />;
        case PACKET_KIND_RW: return <CreateIcon className={className} />;
        case CONST_NODE_NAME: return <LockIcon className={className} />;
        case COMMAND_NODE_NAME: return <CallToActionIcon className={className} />;
        case EVENT_NODE_NAME: return <FlashOnIcon className={className} />;
        case REPORT_NODE_NAME: return <ReplyIcon className={className} />;
        case BUS_NODE_NAME: return <DeviceHubIcon className={className} />;
        case DEVICE_NODE_NAME: return <DockIcon className={className} />;
        case VIRTUAL_DEVICE_NODE_NAME: return <ComputerIcon className={className} />;
        case SERVICE_NODE_NAME: return <BubbleChartIcon className={className} />
    }
    return <DeviceUnknownIcon className={className} />;
}

export function kindName(kind: string) {
    switch (kind) {
        case PACKET_KIND_RO: return "read-only";
        case PACKET_KIND_RW: return "read-write";
        default: return kind
    }
}

export function allKinds() {
    return [REPORT_NODE_NAME,
        PACKET_KIND_RW,
        PACKET_KIND_RO,
        CONST_NODE_NAME,
        EVENT_NODE_NAME,
        COMMAND_NODE_NAME,
    ]
}
