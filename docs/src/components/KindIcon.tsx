import React from "react"
// tslint:disable-next-line: no-submodule-imports
import CreateIcon from '@material-ui/icons/Create';
// tslint:disable-next-line: no-submodule-imports
import LockIcon from '@material-ui/icons/Lock';
// tslint:disable-next-line: no-submodule-imports
import CallToActionIcon from '@material-ui/icons/CallToAction';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import FlashOnIcon from '@material-ui/icons/FlashOn';

export default function KindIcon(props: { kind: string }) {
    switch (props.kind) {
        case "ro": return <LockIcon />;
        case "rw": return <CreateIcon />;
        case "command": return <CallToActionIcon />;
        case "event": return <FlashOnIcon />;
    }
    return undefined;
}
