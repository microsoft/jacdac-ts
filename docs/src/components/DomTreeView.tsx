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
import { JDDevice } from '../../../src/dom/device';
import { JDEvent } from '../../../src/dom/event';
import { JDService } from '../../../src/dom/service';
import { JDRegister } from '../../../src/dom/register';
import useChange from "../jacdac/useChange";
import { isRegister, isEvent, isReading } from '../../../src/dom/spec';
import { Switch } from '@material-ui/core';
import { useRegisterHumanValue } from '../jacdac/useRegisterValue';
import useEventCount from '../jacdac/useEventCount';
import DeviceActions from './DeviceActions';
import { LOST, FOUND, SRV_CTRL, SRV_LOGGER } from '../../../src/dom/constants';
import useEventRaised from '../jacdac/useEventRaised';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import NotificationImportantIcon from '@material-ui/icons/NotificationImportant';
import { ellipseJoin } from '../../../src/dom/utils';
import { Link } from 'gatsby-theme-material-ui';
import useDeviceName from './useDeviceName';

declare module 'csstype' {
    interface Properties {
        '--tree-view-color'?: string;
        '--tree-view-bg-color'?: string;
    }
}

const useTreeItemStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            marginLeft: theme.spacing(1),
            color: theme.palette.text.secondary,
            '&:hover > $content': {
                backgroundColor: theme.palette.action.hover,
            },
            '&:focus > $content, &$selected > $content': {
                backgroundColor: `var(--tree-view-bg-color, ${theme.palette.grey[400]})`,
                color: 'var(--tree-view-color)',
            },
            '&:focus > $content $label, &:hover > $content $label, &$selected > $content $label': {
                backgroundColor: 'transparent',
            },
        },
        content: {
            color: theme.palette.text.secondary,
            borderTopRightRadius: theme.spacing(2),
            borderBottomRightRadius: theme.spacing(2),
            paddingRight: theme.spacing(1),
            fontWeight: theme.typography.fontWeightMedium,
            '$expanded > &': {
                fontWeight: theme.typography.fontWeightRegular,
            },
        },
        group: {
            marginLeft: 0,
            '& $content': {
                paddingLeft: theme.spacing(2),
            },
        },
        expanded: {},
        selected: {},
        label: {
            fontWeight: 'inherit',
            color: 'inherit',
        },
        labelRoot: {
            display: 'flex',
            alignItems: 'center',
            padding: theme.spacing(0.5, 0),
        },
        labelIcon: {
            marginRight: theme.spacing(1),
        },
        labelText: {
            fontWeight: 'inherit',
            flexGrow: 1,
        },
    }),
);

function StyledTreeItem(props: TreeItemProps & {
    nodeId: string;
    bgColor?: string;
    color?: string;
    kind?: string;
    alert?: string;
    labelInfo?: string;
    labelText: string;
    checked?: boolean;
    setChecked?: (state: boolean) => void;
    actions?: JSX.Element | JSX.Element[]
}) {
    const classes = useTreeItemStyles();
    const { labelText, kind, labelInfo, color, bgColor, checked, setChecked, actions, nodeId, alert, ...other } = props;
    const [checkedState, setCheckedState] = useState(checked)

    const handleChecked = (ev: ChangeEvent<HTMLInputElement>, c: boolean) => {
        ev.stopPropagation()
        setChecked(c)
        setCheckedState(c)
    }
    return (
        <TreeItem
            nodeId={nodeId}
            label={
                <div className={classes.labelRoot}>
                    {setChecked && <Switch
                        checked={checkedState}
                        color="primary"
                        inputProps={{ 'aria-label': 'secondary checkbox' }}
                        onChange={handleChecked}
                    />}
                    <KindIcon kind={kind} className={classes.labelIcon} />
                    <Typography variant="body2" className={classes.labelText}>
                        {labelText}
                    </Typography>
                    {alert && <NotificationImportantIcon color="secondary" />}
                    <Typography variant="caption" color="inherit">
                        {alert && <Typography component="span" color="secondary">
                            {alert}
                        </Typography>}
                        {labelInfo}
                        {actions}
                    </Typography>
                </div>
            }
            style={{
                '--tree-view-color': color,
                '--tree-view-bg-color': bgColor,
            }}
            classes={{
                root: classes.root,
                content: classes.content,
                expanded: classes.expanded,
                selected: classes.selected,
                group: classes.group,
                label: classes.label,
            }}
            {...other}
        />
    );
}

const useStyles = makeStyles(
    createStyles({
        root: {
            flexGrow: 1,
        },
    }),
);

interface DomTreeViewItemProps {
    key: string;
    expanded: string[];
    selected: string[];
    checked?: string[];
    setChecked?: (id: string, value: boolean) => void;
}

function DeviceTreeItem(props: { device: JDDevice } & DomTreeViewItemProps & DomTreeViewProps) {
    const { device, checked, setChecked, checkboxes, serviceFilter, ...other } = props
    const id = device.id
    const name = useDeviceName(device, true)
    const lost = useEventRaised([LOST, FOUND], device, dev => !!dev?.lost)
    const services = useChange(device, () => device.services().filter(srv => !serviceFilter || serviceFilter(srv)))

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
        actions={<DeviceActions device={device} reset={true} rename={true} />}
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

function ServiceTreeItem(props: { service: JDService } & DomTreeViewItemProps & DomTreeViewProps) {
    const { service, checked, setChecked, checkboxes, registerFilter, eventFilter, ...other } = props;
    const specification = service.specification;
    const id = service.id
    const name = service.name
    const packets = useChange(service, () => specification?.packets)
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
        checked={checked?.indexOf(id) > -1}
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

function RegisterTreeItem(props: { register: JDRegister } & DomTreeViewItemProps & DomTreeViewProps) {
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
        checked={checked?.indexOf(id) > -1}
        setChecked={checkboxes?.indexOf("register") > -1 && setChecked && handleChecked}
    />
}

function EventTreeItem(props: { event: JDEvent } & DomTreeViewItemProps & DomTreeViewProps) {
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

export interface DomTreeViewProps {
    defaultChecked?: string[];
    defaultExpanded?: string[];
    defaultSelected?: string[];
    checkboxes?: ("device" | "service" | "register" | "event")[];
    onToggle?: (expanded: string[]) => void;
    onSelect?: (selected: string[]) => void;
    onChecked?: (checked: string[]) => void;
    deviceFilter?: (devices: JDDevice) => boolean;
    serviceFilter?: (services: JDService) => boolean;
    registerFilter?: (register: JDRegister) => boolean;
    eventFilter?: (event: JDEvent) => boolean;
}

export default function DomTreeView(props: DomTreeViewProps) {
    const { onChecked, defaultExpanded, defaultSelected, defaultChecked, onToggle, onSelect, checkboxes, deviceFilter, ...other } = props;
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