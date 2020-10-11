import { makeStyles, Theme, createStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import InputBase from '@material-ui/core/InputBase';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import SearchIcon from '@material-ui/icons/Search';
import DirectionsIcon from '@material-ui/icons/Directions';
import FilterListIcon from '@material-ui/icons/FilterList';
import { Box, Button, Chip, FormControl, InputLabel, ListItemIcon, Menu, MenuItem, Select, TextField, Tooltip, useMediaQuery, useTheme } from "@material-ui/core";
import React, { useContext, useState } from "react";
import { serviceName } from "../../../src/dom/pretty";
import { unique } from "../../../src/dom/utils";
import KindIcon, { allKinds, kindName } from "./KindIcon";
import PacketsContext from "./PacketsContext";
import { parsePacketFilter } from '../../../src/dom/packet';


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
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const theme = useTheme();
    const kinds = allKinds()

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
                        {icon || <MenuIcon />}
                    </IconButton>
                </span>
            </Tooltip>
            <Menu
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleClose}>
                {kinds.map(kind => <MenuItem key={kind} value={kind} onClick={handleKind(`kind:${kind}`)}>
                    <ListItemIcon>
                        <KindIcon kind={kind} />
                    </ListItemIcon>
                    {kindName(kind)}
                </MenuItem>)}
                <MenuItem key="announce" value={"announce"} onClick={handleKind("announce")}>
                    Repeated Announce</MenuItem>
            </Menu>
        </Box>
    );
}

export default function PacketFilter() {
    const { filter, setFilter } = useContext(PacketsContext)
    const classes = useStyles();

    const handleChange = (ev) => {
        setFilter(ev.target.value)
    }
    const handleAddFilter = (k: string) => {
        setFilter(parsePacketFilter(filter + " " + k).normalized);
    }
    return <Box display="flex">
        <span>
            <SimpleMenu className={classes.iconButton} text="Filters" handleAddFilter={handleAddFilter} />
        </span>
        <InputBase
            className={classes.input}
            placeholder="kind:report kind:command kind:event"
            inputProps={{ 'aria-label': 'filter packets' }}
            value={filter}
            onChange={handleChange}
        />
    </Box>
}
