import { Box, Button, Chip, FormControl, InputLabel, ListItemIcon, Menu, MenuItem, Select, useMediaQuery, useTheme } from "@material-ui/core";
import React, { useContext, useState } from "react";
import { serviceName } from "../../../src/dom/pretty";
import { unique } from "../../../src/dom/utils";
import KindIcon, { allKinds, kindName } from "./KindIcon";
import PacketsContext from "./PacketsContext";

function SimpleMenu(props: { text: string, children: any }) {
    const { text, children } = props;
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const theme = useTheme();

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    return (
        <Box component="span" m={theme.spacing(0.2)}>
            <Button aria-controls="simple-menu"
                aria-haspopup="true"
                variant="outlined"
                onClick={handleClick}>
                {text}
            </Button>
            <Menu
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleClose}>
                {children}
            </Menu>
        </Box>
    );
}

export default function PacketFilter() {
    const { flags, setFlags, serviceClass, setServiceClass } = useContext(PacketsContext)
    const kinds = allKinds()
    const theme = useTheme();

    const handleKind = (kind: string) => () => {
        setFlags(unique([...flags, kind]));
    };
    const handleDelete = (flag: string) => () => {
        flags.splice(flags.indexOf(flag), 1)
        setFlags(flags.slice(0))
    }
    const handleDeleteServiceClass = () => setServiceClass(undefined)

    return <Box>
        <SimpleMenu text="Filters">
            {kinds.map(kind => <MenuItem key={kind} value={kind} onClick={handleKind(kind)}>
                <ListItemIcon>
                    <KindIcon kind={kind} />
                </ListItemIcon>
                {kindName(kind)}
            </MenuItem>)}
            <MenuItem key="annoucement" value={"announcement"}>
                Repeated Announce</MenuItem>
        </SimpleMenu>
        {flags.map(flag => <Box component="span" mr={theme.spacing(0.1)}><Chip
            icon={<KindIcon kind={flag} />}
            label={kindName(flag)}
            color="primary"
            onDelete={handleDelete(flag)} /></Box>)}
        {serviceClass !== undefined &&
            <Chip
                icon={<KindIcon kind="service" />}
                label={serviceName(serviceClass)}
                color="secondary"
                onDelete={handleDeleteServiceClass}
                />
                }
    </Box>
}
