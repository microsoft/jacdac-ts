import React, { useContext } from "react";
import { Drawer, makeStyles, createStyles, List, ListItemIcon, ListItemText, Typography, ListItem, Divider } from "@material-ui/core";
import { IconButton, Link } from "gatsby-theme-material-ui";
// tslint:disable-next-line: no-submodule-imports
import { MOBILE_BREAKPOINT, MOBILE_TOOLS_DRAWER_WIDTH, TOOLS_DRAWER_WIDTH } from "./layout";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import AppContext, { } from "./AppContext";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import FiberManualRecordIcon from '@material-ui/icons/FiberManualRecord';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import EditIcon from '@material-ui/icons/Edit';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import SystemUpdateAltIcon from '@material-ui/icons/SystemUpdateAlt';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import EmojiObjectsIcon from '@material-ui/icons/EmojiObjects';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import EmojiNatureIcon from '@material-ui/icons/EmojiNature';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import HistoryIcon from '@material-ui/icons/History';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import SettingsBrightnessIcon from '@material-ui/icons/SettingsBrightness';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import LineWeightIcon from '@material-ui/icons/LineWeight';
import ServiceManagerContext from "./ServiceManagerContext";
import DarkModeContext from "./DarkModeContext";

const useStyles = makeStyles((theme) => createStyles({
    drawer: {
        width: `${TOOLS_DRAWER_WIDTH}rem`,
        flexShrink: 0,
        [theme.breakpoints.down(MOBILE_BREAKPOINT)]: {
            width: `${MOBILE_TOOLS_DRAWER_WIDTH}rem`,
        }
    },
    drawerPaper: {
        width: `${TOOLS_DRAWER_WIDTH}rem`,
        [theme.breakpoints.down(MOBILE_BREAKPOINT)]: {
            width: `${MOBILE_TOOLS_DRAWER_WIDTH}rem`,
        }
    },
    drawerHeader: {
        display: 'flex',
        alignItems: 'center',
        padding: theme.spacing(0, 1),
        // necessary for content to be below app bar
        ...theme.mixins.toolbar,
        justifyContent: 'flex-start',
    }
}));

export default function ToolsDrawer() {
    const classes = useStyles()
    const { toolsMenu, setToolsMenu } = useContext(AppContext)
    const { isHosted } = useContext(ServiceManagerContext)
    const { toggleDarkMode, darkMode } = useContext(DarkModeContext)
    const handleDrawerClose = () => {
        setToolsMenu(false)
    }
    const handleDarkMode = () => {
        toggleDarkMode()
        setToolsMenu(false)
    }

    if (!toolsMenu)
        return <></>

    return <Drawer
        className={classes.drawer}
        variant="persistent"
        anchor="right"
        open={toolsMenu}
        classes={{
            paper: classes.drawerPaper,
        }}
    >
        <div className={classes.drawerHeader}>
            <IconButton onClick={handleDrawerClose}>
                <ChevronRightIcon />
            </IconButton>
        </div>
        <List>
            <Link to="/tools/role-manager">
                <ListItem button key="collector">
                    <ListItemIcon><EmojiObjectsIcon /></ListItemIcon>
                    <ListItemText primaryTypographyProps={({ color: "textPrimary" })} primary={"Role Manager"} />
                </ListItem>
            </Link>
            <Link to="/tools/collector">
                <ListItem button key="collector">
                    <ListItemIcon><FiberManualRecordIcon /></ListItemIcon>
                    <ListItemText primaryTypographyProps={({ color: "textPrimary" })} primary={"Data collection"} />
                </ListItem>
            </Link>
            <Link to="/tools/model-uploader">
                <ListItem button key="model-uploader">
                    <ListItemIcon><EmojiNatureIcon /></ListItemIcon>
                    <ListItemText primaryTypographyProps={({ color: "textPrimary" })} primary={"Deploy ML models"} />
                </ListItem>
            </Link>
            <Link to="/tools/edge-impulse">
                <ListItem button key="edge-impulse">
                    <ListItemIcon><LineWeightIcon /></ListItemIcon>
                    <ListItemText primaryTypographyProps={({ color: "textPrimary" })} primary={"Edge Impulse"} />
                </ListItem>
            </Link>
            <Divider />
            <Link to="/tools/updater">
                <ListItem button key="updater">
                    <ListItemIcon><SystemUpdateAltIcon /></ListItemIcon>
                    <ListItemText primaryTypographyProps={({ color: "textPrimary" })} primary={"Firmware update"} />
                </ListItem>
            </Link>
            <Link to="/tools/packet-inspector">
                <ListItem button key="packets">
                    <ListItemIcon><HistoryIcon /></ListItemIcon>
                    <ListItemText primaryTypographyProps={({ color: "textPrimary" })} primary={"Packet inspector"} />
                </ListItem>
            </Link>
            <Link to="/tools/service-editor">
                <ListItem button key="service-editor">
                    <ListItemIcon><EditIcon /></ListItemIcon>
                    <ListItemText primaryTypographyProps={({ color: "textPrimary" })} primary={"Service specification editor"} />
                </ListItem>
            </Link>
            <Divider />
            {!isHosted &&
                <ListItem button={true} onClick={handleDarkMode} aria-label="Toggle Dark Mode">
                    <ListItemIcon><SettingsBrightnessIcon /></ListItemIcon>
                    <ListItemText>{darkMode === 'light' ? "Dark Mode" : "Light mode"}</ListItemText>
                </ListItem>}
        </List>
    </Drawer>
}