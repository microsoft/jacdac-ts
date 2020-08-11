import React, { useContext, useState, ChangeEvent } from 'react';
import JacdacContext from '../../../src/react/Context';
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
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import { SvgIconProps } from '@material-ui/core/SvgIcon';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import DockIcon from '@material-ui/icons/Dock';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import BubbleChartIcon from '@material-ui/icons/BubbleChart';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ReplyIcon from '@material-ui/icons/Reply';
import { JDDevice } from '../../../src/dom/device';
import { JDService } from '../../../src/dom/service';
import { JDRegister } from '../../../src/dom/register';
import useChange from "../jacdac/useChange";
import { isRegister } from '../../../src/dom/spec';
import { Checkbox } from '@material-ui/core';

declare module 'csstype' {
    interface Properties {
        '--tree-view-color'?: string;
        '--tree-view-bg-color'?: string;
    }
}

const useTreeItemStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
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
    bgColor?: string;
    color?: string;
    labelIcon: React.ElementType<SvgIconProps>;
    labelInfo?: string;
    labelText: string;
    checked?: boolean;
    setChecked?: (state: boolean) => void;
}) {
    const classes = useTreeItemStyles();
    const { labelText, labelIcon: LabelIcon, labelInfo, color, bgColor, checked, setChecked, ...other } = props;
    const [checkedState, setCheckedState] = useState(false)

    const handleChecked = (ev: ChangeEvent<HTMLInputElement>, c: boolean) => {
        setChecked(c)
        setCheckedState(c)
    }
    return (
        <TreeItem
            label={
                <div className={classes.labelRoot}>
                    {setChecked && <Checkbox
                        checked={checkedState}
                        color="primary"
                        inputProps={{ 'aria-label': 'secondary checkbox' }}
                        onChange={handleChecked}
                    />}
                    <LabelIcon color="inherit" className={classes.labelIcon} />
                    <Typography variant="body2" className={classes.labelText}>
                        {labelText}
                    </Typography>
                    <Typography variant="caption" color="inherit">
                        {labelInfo}
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
    checked?: { [id: string]: boolean }
    setChecked?: (id: string, value: boolean) => void;
}

function DeviceTreeItem(props: { device: JDDevice } & DomTreeViewItemProps & DomTreeViewProps) {
    const { device, checked, setChecked, checkboxes, serviceFilter, ...other } = props
    const id = device.id
    const name = device.name
    const services = useChange(device, () => device.services().filter(srv => !serviceFilter || serviceFilter(srv)))

    const handleChecked = c => setChecked(id, c)
    return <StyledTreeItem
        nodeId={id}
        labelText={name}
        labelInfo={id}
        labelIcon={DockIcon}
        checked={checked && checked[id]}
        setChecked={checkboxes && checkboxes.indexOf("device") > -1 && setChecked && handleChecked}
    >
        {services?.map(service => <ServiceTreeItem
            service={service}
            checked={checked}
            setChecked={setChecked}
            checkboxes={checkboxes}
            {...other}
        />)}
    </StyledTreeItem>
}

function ServiceTreeItem(props: { service: JDService } & DomTreeViewItemProps & DomTreeViewProps) {
    const { service, checked, setChecked, checkboxes, ...other } = props;
    const specification = service.specification;
    const id = service.id
    const name = service.name
    const registers = useChange(service, () => specification?.packets
        .filter(isRegister)
        .map(info => service.register(info.identifier)));

    const handleChecked = c => setChecked(id, c)
    return <StyledTreeItem
        nodeId={id}
        labelText={name}
        labelInfo={id}
        labelIcon={BubbleChartIcon}
        checked={checked && checked[id]}
        setChecked={checkboxes && checkboxes.indexOf("service") > -1 && setChecked && handleChecked}
    >
        {registers?.map(register => <RegisterTreeItem
            register={register}
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

    const handleClick = () => {
        console.log(`click ${id}`)
    }

    const handleChecked = c => {
        console.log(`checked ${id} -> ${c}`)
        setChecked(id, c)
    }
    return <StyledTreeItem
        nodeId={id}
        labelText={specification?.name || register.id}
        labelInfo={id}
        labelIcon={ReplyIcon}
        onClick={handleClick}
        checked={checked && checked[id]}
        setChecked={checkboxes && checkboxes.indexOf("register") > -1 && setChecked && handleChecked}
    />
}

export type CheckedMap = { [id: string]: boolean };

export interface DomTreeViewProps {
    defaultChecked?: CheckedMap;
    checkboxes?: ("device" | "service" | "register")[];
    onSelect?: (selected: string[]) => void;
    onChecked?: (checked: CheckedMap) => void;
    deviceFilter?: (devices: JDDevice) => boolean;
    serviceFilter?: (services: JDService) => boolean;
}

export default function DomTreeView(props: DomTreeViewProps) {
    const { onChecked, defaultChecked, onSelect, checkboxes, deviceFilter, ...other } = props;
    const classes = useStyles();
    const [expanded, setExpanded] = useState<string[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [checked, setChecked] = useState<{ [id: string]: boolean }>(defaultChecked || {})
    const { bus } = useContext(JacdacContext)
    const devices = useChange(bus, () => bus.devices().filter(dev => !deviceFilter || deviceFilter(dev)))

    const handleToggle = (event: React.ChangeEvent<{}>, nodeIds: string[]) => {
        setExpanded(nodeIds);
    };

    const handleSelect = (event: React.ChangeEvent<{}>, nodeIds: string[]) => {
        setSelected(nodeIds);
        if (onSelect) onSelect(nodeIds)
    };
    const handleChecked = (id: string, v: boolean) => {
        checked[id] = v;
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
                device={device}
                checked={checked}
                setChecked={handleChecked}
                checkboxes={checkboxes}
                {...other}
            />)}
        </TreeView>
    );
}