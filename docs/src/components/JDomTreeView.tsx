import React, { useContext, useState, ChangeEvent } from 'react';
import JACDACContext, { JDContextProps } from '../../../src/react/Context';
// tslint:disable-next-line: no-submodule-imports
import { makeStyles, Theme, createStyles } from '@material-ui/core/styles';
// tslint:disable-next-line: no-submodule-imports
import TreeView from '@material-ui/lab/TreeView';
// tslint:disable-next-line: no-submodule-imports
import TreeItem, { TreeItemProps } from '@material-ui/lab/TreeItem';
// tslint:disable-next-line: no-submodule-imports
import Typography from '@material-ui/core/Typography';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ArrowRightIcon from '@material-ui/icons/ArrowRight';
import KindIcon from "./KindIcon"
import { JDDevice } from '../../../src/jdom/device';
import { JDEvent } from '../../../src/jdom/event';
import { JDService } from '../../../src/jdom/service';
import { JDRegister } from '../../../src/jdom/register';
import useChange from "../jacdac/useChange";
import { isRegister, isEvent, isReading } from '../../../src/jdom/spec';
import { Switch, useMediaQuery, useTheme } from '@material-ui/core';
import { useRegisterHumanValue } from '../jacdac/useRegisterValue';
import useEventCount from '../jacdac/useEventCount';
import DeviceActions from './DeviceActions';
import { LOST, FOUND, SRV_CTRL, SRV_LOGGER, DEVICE_ANNOUNCE } from '../../../src/jdom/constants';
import useEventRaised from '../jacdac/useEventRaised';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import NotificationImportantIcon from '@material-ui/icons/NotificationImportant';
import { ellipseJoin } from '../../../src/jdom/utils';
import { Link } from 'gatsby-theme-material-ui';
import useDeviceName from './useDeviceName';
import ConnectAlert from "./ConnectAlert"
import { isWebUSBSupported } from '../../../src/jdom/usb';
import { StyledTreeItem, StyledTreeViewItemProps, StyledTreeViewProps } from './StyledTreeView';

function DeviceTreeItem(props: { device: JDDevice } & StyledTreeViewItemProps & JDomTreeViewProps) {
    const { device, checked, setChecked, checkboxes, serviceFilter, ...other } = props
    const id = device.id
    const name = useDeviceName(device, true)
    const lost = useEventRaised([LOST, FOUND], device, dev => !!dev?.lost)
    const services = useChange(device, () => device.services().filter(srv => !serviceFilter || serviceFilter(srv)))
    const theme = useTheme()
    const showActions = useMediaQuery(theme.breakpoints.up('sm'))

    const readings = ellipseJoin(services
        .filter(service => service.serviceClass !== SRV_CTRL && service.serviceClass !== SRV_LOGGER)
        .map(service => service.name), 2)

    const handleChecked = c => setChecked(id, c)
    return <StyledTreeItem
        nodeId={id}
        labelText={name}
        labelInfo={readings}
        alert={lost && "Lost device..."}
        kind={"device"}
        checked={checked?.indexOf(id) > -1}
        setChecked={checkboxes && checkboxes.indexOf("device") > -1 && setChecked && handleChecked}
        actions={showActions && <DeviceActions device={device} reset={true} rename={true} />}
    >
        {services?.map(service => <ServiceTreeItem
            key={service.id}
            service={service}
            checked={checked}
            setChecked={setChecked}
            checkboxes={checkboxes}
            {...other}
        />)}
    </StyledTreeItem>
}

function ServiceTreeItem(props: { service: JDService } & StyledTreeViewItemProps & JDomTreeViewProps) {
    const { service, checked, setChecked, checkboxes, registerFilter, eventFilter, ...other } = props;
    const specification = service.specification;
    const id = service.id
    const name = service.name
    const open = checked?.indexOf(id) > -1;
    const packets = specification?.packets;
    const registers = packets?.filter(isRegister)
        .map(info => service.register(info.identifier))
        .filter(reg => !registerFilter || registerFilter(reg))
    const events = packets?.filter(isEvent)
        .map(info => service.event(info.identifier))
        .filter(ev => !eventFilter || eventFilter(ev))
    const readingRegister = service.readingRegister;
    const reading = useRegisterHumanValue(readingRegister)

    const handleChecked = c => setChecked(id, c)
    return <StyledTreeItem
        nodeId={id}
        labelText={name}
        labelInfo={reading}
        kind={"service"}
        checked={open}
        setChecked={checkboxes?.indexOf("service") > -1 && setChecked && handleChecked}
        actions={specification && <Link color="inherit" to={`/services/${specification.shortId}`}>
            <KindIcon kind="service" />
        </Link>}
    >
        {registers?.map(register => <RegisterTreeItem
            key={register.id}
            register={register}
            checked={checked}
            setChecked={setChecked}
            checkboxes={checkboxes}
            {...other}
        />)}
        {events?.map(event => <EventTreeItem
            key={event.id}
            event={event}
            checked={checked}
            setChecked={setChecked}
            checkboxes={checkboxes}
            {...other}
        />)}
    </StyledTreeItem>
}

function RegisterTreeItem(props: { register: JDRegister } & StyledTreeViewItemProps & JDomTreeViewProps) {
    const { register, checked, setChecked, checkboxes } = props;
    const { specification, id } = register
    const humanValue = useRegisterHumanValue(register)

    const handleChecked = c => {
        setChecked(id, c)
    }
    return <StyledTreeItem
        nodeId={id}
        labelText={specification?.name || register.id}
        labelInfo={humanValue}
        kind={specification?.kind || "register"}
        alert={register.lastGetAttempts > 2 && "???"}
        checked={checked?.indexOf(id) > -1}
        setChecked={checkboxes?.indexOf("register") > -1 && setChecked && handleChecked}
    />
}

function EventTreeItem(props: { event: JDEvent } & StyledTreeViewItemProps & JDomTreeViewProps) {
    const { event, checked, setChecked, checkboxes } = props;
    const { specification, id } = event
    const count = useEventCount(event)

    const handleChecked = c => {
        setChecked(id, c)
    }
    return <StyledTreeItem
        nodeId={id}
        labelText={specification?.name || event.id}
        labelInfo={(count || "") + ""}
        kind="event"
        checked={checked?.indexOf(id) > -1}
        setChecked={checkboxes?.indexOf("event") > -1 && setChecked && handleChecked}
    />
}

export type CheckedMap = { [id: string]: boolean };

export interface JDomTreeViewProps extends StyledTreeViewProps {
    checkboxes?: ("device" | "service" | "register" | "event")[];
    deviceFilter?: (devices: JDDevice) => boolean;
    serviceFilter?: (services: JDService) => boolean;
    registerFilter?: (register: JDRegister) => boolean;
    eventFilter?: (event: JDEvent) => boolean;
}

const useStyles = makeStyles(
    createStyles({
        root: {
            flexGrow: 1,
        },
    }),
);

export default function JDomTreeView(props: JDomTreeViewProps) {
    const {
        defaultExpanded, defaultSelected, defaultChecked,
        onChecked, onToggle, onSelect, checkboxes, deviceFilter, ...other } = props;
    const classes = useStyles();
    const [expanded, setExpanded] = useState<string[]>(defaultExpanded || []);
    const [selected, setSelected] = useState<string[]>(defaultSelected || []);
    const [checked, setChecked] = useState<string[]>(defaultChecked || [])
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const devices = useChange(bus, () => bus.devices().filter(dev => !deviceFilter || deviceFilter(dev)))

    const handleToggle = (event: React.ChangeEvent<{}>, nodeIds: string[]) => {
        setExpanded(nodeIds);
        if (onToggle) onToggle(nodeIds)
    };

    const handleSelect = (event: React.ChangeEvent<{}>, nodeIds: string[]) => {
        setSelected(nodeIds);
        if (onSelect) onSelect(nodeIds)
    };
    const handleChecked = (id: string, v: boolean) => {
        const i = checked.indexOf(id)
        if (!v && i > -1)
            checked.splice(i, 1)
        else if (v && i < 0)
            checked.push(id)
        setChecked(checked)
        if (onChecked)
            onChecked(checked)
    };

    if (!devices?.length && isWebUSBSupported())
        return <ConnectAlert />

    return (
        <TreeView
            className={classes.root}
            defaultCollapseIcon={<ArrowDropDownIcon />}
            defaultExpandIcon={<ArrowRightIcon />}
            defaultEndIcon={<div style={{ width: 24 }} />}
            expanded={expanded}
            selected={selected}
            onNodeToggle={handleToggle}
            onNodeSelect={handleSelect}
        >
            {devices?.map(device => <DeviceTreeItem
                key={device.id}
                device={device}
                checked={checked}
                setChecked={handleChecked}
                checkboxes={checkboxes}
                expanded={expanded}
                selected={selected}
                {...other}
            />)}
        </TreeView>
    );
}