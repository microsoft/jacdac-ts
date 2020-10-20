import { Badge, IconButton, Tooltip } from "@material-ui/core";
import React, { useContext, useEffect, useState } from "react";
import AppContext, { DrawerType } from "./AppContext";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import HistoryIcon from '@material-ui/icons/History';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import MenuIcon from '@material-ui/icons/Menu';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import AccountTreeIcon from '@material-ui/icons/AccountTree';
import IconButtonWithTooltip from "./IconButtonWithTooltip";
import ConnectButton from "../jacdac/ConnectButton";
import JACDACContext, { JDContextProps } from "../../../src/react/Context";
import { DEVICE_CHANGE } from "../../../src/dom/constants";

export default function DrawerToolsButtonGroup(props: { className?: string, showToc?: boolean, showCurrent?: boolean, showConnect?: boolean }) {
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const { className, showToc, showCurrent, showConnect } = props;
    const { drawerType, setDrawerType } = useContext(AppContext)
    const [count, setCount] = useState(bus.devices().length)
    useEffect(() => bus.subscribe(DEVICE_CHANGE, () => setCount(bus.devices().length)))

    const handleDrawer = (drawer: DrawerType) => () => setDrawerType(drawer);
    const drawers = [
        showToc && {
            drawer: DrawerType.Toc,
            label: "open table of contents",
            icon: <MenuIcon />
        },
        {
            drawer: DrawerType.Dom,
            label: "open device tree",
            icon: <Badge badgeContent={count}>
                <AccountTreeIcon />
            </Badge>
        },
        {
            drawer: DrawerType.Packets,
            label: "open packet console",
            icon: <HistoryIcon />
        }
    ].filter(d => !!d)
        .filter(d => showCurrent || d.drawer !== drawerType);

    return <>
        {drawers.map(drawer =>
            <IconButtonWithTooltip key={drawer.label}
                title={drawer.label}
                className={className}
                color="inherit"
                onClick={handleDrawer(drawer.drawer)}
                edge="start"
            > {drawer.icon}
            </IconButtonWithTooltip>)}
        {showConnect && <ConnectButton transparent={true} full={false} />}
    </>
}