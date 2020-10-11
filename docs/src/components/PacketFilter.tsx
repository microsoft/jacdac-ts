import { makeStyles, Theme, createStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import InputBase from '@material-ui/core/InputBase';
import IconButton from '@material-ui/core/IconButton';
import FilterListIcon from '@material-ui/icons/FilterList';
import { Box, ListItemIcon, Menu, MenuItem, Tooltip } from "@material-ui/core";
import React, { useContext, useEffect, useState } from "react";
import KindIcon, { allKinds, kindName } from "./KindIcon";
import PacketsContext from "./PacketsContext";
import JACDACContext, { JDContextProps } from '../../../src/react/Context';
import useChange from '../jacdac/useChange';
import DeviceName from './DeviceName';
import useDebounce from './useDebounce';


const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        input: {
            marginLeft: theme.spacing(1),
            flex: 1,
        },
        iconButton: {
            padding: 10,
        },
        divider: {
            height: 28,
            margin: 4,
        },
    }),
);

function SimpleMenu(props: { text?: string, icon?: JSX.Element, className?: string, handleAddFilter: (k: string) => void }) {
    const { text, icon, className, handleAddFilter } = props;
    const { bus } = useContext<JDContextProps>(JACDACContext)
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const kinds = allKinds()

    const devices = useChange(bus, b => b.devices());

    const handleKind = (kind: string) => () => {
        handleAddFilter(kind)
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
                    <IconButton aria-controls="simple-menu"
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
                {kinds.map(kind => <MenuItem key={kind} onClick={handleKind(`kind:${kind}`)}>
                    <ListItemIcon>
                        <KindIcon kind={kind} />
                    </ListItemIcon>
                    {kindName(kind)}
                </MenuItem>)}
                <MenuItem key="announce" value={"announce"} onClick={handleKind("announce")}>
                    <ListItemIcon>
                        <KindIcon kind={"announce"} />
                    </ListItemIcon>
                    Repeated Announce</MenuItem>
                {devices?.map(device => <MenuItem key={device.id} onClick={handleKind(`dev:${device.shortId}`)}>
                    <ListItemIcon>
                        <KindIcon kind={"device"} />
                    </ListItemIcon>
                    <DeviceName device={device} />
                </MenuItem>)}
            </Menu>
        </Box>
    );
}

export default function PacketFilter() {
    const { filter, setFilter } = useContext(PacketsContext)
    const classes = useStyles();
    const [text, setText] = useState(filter);
    const debouncedText = useDebounce(text, 1000);

    console.log('filter', filter, debouncedText)

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
    return <Paper square elevation={1}>
        <Box display="flex">
            <span>
                <SimpleMenu className={classes.iconButton} text="Filters" handleAddFilter={handleAddFilter} />
            </span>
            <InputBase
                multiline={true}
                className={classes.input}
                placeholder="Filter packets"
                inputProps={{ 'aria-label': 'filter packets' }}
                value={text}
                onChange={handleChange}
            />
        </Box>
    </Paper>
}
