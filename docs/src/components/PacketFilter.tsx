import { makeStyles, Theme, createStyles, Paper, InputBase } from '@material-ui/core';
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import FilterListIcon from '@material-ui/icons/FilterList';
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import QueryBuilderIcon from '@material-ui/icons/QueryBuilder';
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import ClearIcon from '@material-ui/icons/Clear';
import { Box, ListItemIcon, Menu, MenuItem, Typography } from "@material-ui/core";
import React, { useContext, useEffect, useState } from "react";
import KindIcon, { allKinds, kindName } from "./KindIcon";
import PacketsContext from "./PacketsContext";
import JACDACContext, { JDContextProps } from '../../../src/react/Context';
import useChange from '../jacdac/useChange';
import DeviceName from './DeviceName';
import { useDebounce } from 'use-debounce';
import { arrayConcatMany, uniqueMap } from '../../../src/jdom/utils';
import TraceTimeFilterRangeSlider from './TraceTimeFilterRangeSlider';
import IconButtonWithTooltip from './ui/IconButtonWithTooltip';
import { IconButton } from 'gatsby-theme-material-ui';
// tslint:disable-next-line: match-default-export-name no-submodule-imports
import GroupWorkIcon from '@material-ui/icons/GroupWork';
import { isCommand, isEvent, isPipeReport, isRegister } from '../../../src/jdom/spec';
import Tooltip from './ui/Tooltip';

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        input: {
            marginLeft: theme.spacing(1),
            flex: 1,
        },
        iconButton: {
            padding: theme.spacing(0.5)
        },
        divider: {
            height: 28,
            margin: 4,
        },
    }),
);

function FilterMenu(props: { text?: string, icon?: JSX.Element, className?: string, handleAddFilter: (k: string) => void }) {
    const { text, icon, className, handleAddFilter } = props;
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const kinds = allKinds()
    const classes = useStyles()

    const devices = useChange(bus, b => b.devices());
    const services = uniqueMap(arrayConcatMany(devices.map(device => device.services()))
        , service => service.serviceClass.toString(), srv => srv);
    const serviceIds = services.map(service => service.specification?.shortId || `0x${service.serviceClass.toString()}`);
    const serviceSpecs = services.map(service => service.specification).filter(spec => !!spec);
    const packets = uniqueMap(
        arrayConcatMany(serviceSpecs.map(spec => spec.packets.filter(pkt => pkt.name))),
        pkt => pkt.identifier.toString(16),
        pkt => pkt
    )
    const packetFilter = pkt => isRegister(pkt) ? "register" 
        : isCommand(pkt) ? "command" 
        : isEvent(pkt) ? "event"
        : isPipeReport(pkt) ? "pipe"
        : "pkt";

    const handleAdd = (filter: string) => () => {
        handleAddFilter(filter)
        setAnchorEl(null)
    };
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    return (
        <Box className={className} component="span">
            <Tooltip title={text}>
                <span>
                    <IconButton className={classes.iconButton} aria-controls="simple-menu"
                        aria-haspopup="true"
                        onClick={handleClick}>
                        {icon || <FilterListIcon />}
                    </IconButton>
                </span>
            </Tooltip>
            <Menu
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleClose}>
                {kinds.map(kind => <MenuItem key={kind} onClick={handleAdd(`kind:${kind}`)}>
                    <ListItemIcon>
                        <KindIcon kind={kind} />
                    </ListItemIcon>
                    <Typography>{kindName(kind)}</Typography>&nbsp;
                    <Typography variant="subtitle2">kind:{kind}</Typography>
                </MenuItem>)}
                {[{
                    cmd: "collapse-ack",
                    label: "Disable collapse acks",
                    value: false
                }, {
                    cmd: "announce",
                    value: false
                }, {
                    cmd: "repeated-announce",
                    kind: "announce",
                    value: false
                }, {
                    cmd: "get",
                    kind: "ro",
                    value: true
                }, {
                    cmd: "set",
                    kind: "rw",
                    value: true
                }, {
                    cmd: "collapse-gets",
                    kind: "ro",
                    label: "Disable collapse gets",
                    value: false
                }, {
                    cmd: "pipes",
                    kind: "pipe",
                    value: true
                }, {
                    cmd: "collapse-pipes",
                    kind: "pipe",
                    label: "Disable collapse pipes",
                    value: false
                }].map(({ cmd, kind, value, label }) => <MenuItem key={cmd} onClick={handleAdd(`${cmd}:${value}`)}>
                    <ListItemIcon>
                        <KindIcon kind={kind || cmd} />
                    </ListItemIcon>
                    <Typography>{label || (value ? `Show ${cmd}` : `Hide ${cmd}`)}</Typography>&nbsp;
                <Typography variant="subtitle2">{`${cmd}:${value}`}</Typography>
                </MenuItem>)}
                <MenuItem key="port" onClick={handleAdd("port:42")}>
                    <ListItemIcon>
                        <KindIcon kind={"pipe"} />
                    </ListItemIcon>
                    <Typography>Filter by port 42</Typography>&nbsp;
                    <Typography variant="subtitle2">port:42</Typography>
                </MenuItem>
                <MenuItem key="grouping" onClick={handleAdd("grouping:false")}>
                    <ListItemIcon>
                        <GroupWorkIcon />
                    </ListItemIcon>
                    <Typography>Disable grouping</Typography>&nbsp;
                    <Typography variant="subtitle2">grouping:false</Typography>
                </MenuItem>
                {devices?.map(device => <MenuItem key={`dev:` + device.id} onClick={handleAdd(`dev:${device.name || device.shortId}`)}>
                    <ListItemIcon>
                        <KindIcon kind={"device"} />
                    </ListItemIcon>
                    <DeviceName device={device} />&nbsp;
                    <Typography variant="subtitle2">dev:{device.name || device.shortId}</Typography>
                </MenuItem>)}
                {serviceIds?.map(srv => <MenuItem key={`srv:` + srv} onClick={handleAdd(`srv:${srv}`)}>
                    <ListItemIcon>
                        <KindIcon kind={"service"} />
                    </ListItemIcon>
                    <Typography>{srv}</Typography>&nbsp;
                    <Typography variant="subtitle2">srv:{srv}</Typography>
                </MenuItem>)}
                {packets?.map(pkt => <MenuItem key={`${packetFilter(pkt)}:${pkt.identifier}`} onClick={handleAdd(`${packetFilter(pkt)}:${pkt.name}`)}>
                    <ListItemIcon>
                        <KindIcon kind={pkt.kind} />
                    </ListItemIcon>
                    <Typography>{pkt.name}</Typography>&nbsp;
                    <Typography variant="subtitle2">{packetFilter(pkt)}:{pkt.name}</Typography>
                </MenuItem>)}
            </Menu>
        </Box>
    );
}

export default function PacketFilter() {
    const { trace, timeRange, toggleTimeRange, filter, setFilter } = useContext(PacketsContext)
    const classes = useStyles();
    const [text, setText] = useState(filter);
    const [debouncedText] = useDebounce(text, 1000);

    // background filter update
    useEffect(() => setText(filter), [filter])

    // set filter once bounced
    useEffect(() => {
        setFilter(debouncedText);
    }, [debouncedText]);

    const handleChange = (ev) => {
        const newText = ev.target.value;
        setText(newText)
    }
    const handleAddFilter = (k: string) => {
        setText(text + " " + k);
    }
    const handleClearFilter = () => {
        setText("")
    }

    return <>
        {timeRange && <TraceTimeFilterRangeSlider />}
        <Paper square elevation={1}>
            <Box display="flex">
                <FilterMenu text="Filters" handleAddFilter={handleAddFilter} />
                <IconButtonWithTooltip className={classes.iconButton}
                    disabled={!timeRange && !trace?.length}
                    title={timeRange ? "clear time range" : "use time range"}
                    onClick={toggleTimeRange}>
                    <QueryBuilderIcon />
                </IconButtonWithTooltip>
                <InputBase
                    multiline={true}
                    className={classes.input}
                    placeholder="Filter packets"
                    inputProps={{ 'aria-label': 'filter packets' }}
                    value={text}
                    spellCheck={false}
                    onChange={handleChange}
                />
                {text && <IconButtonWithTooltip className={classes.iconButton}
                    title={"clear filter"}
                    onClick={handleClearFilter}>
                    <ClearIcon />
                </IconButtonWithTooltip>}
            </Box>
        </Paper>
    </>
}
