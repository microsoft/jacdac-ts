import React, { useContext } from "react";
import { Drawer, makeStyles, createStyles, List, ListItemIcon, ListItemText, ListItem, Divider } from "@material-ui/core";
import { IconButton, Link } from "gatsby-theme-material-ui";
// tslint:disable-next-line: no-submodule-imports
import { MOBILE_BREAKPOINT, MOBILE_TOOLS_DRAWER_WIDTH, TOOLS_DRAWER_WIDTH } from "./layout";
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import AppContext, { } from "./AppContext";
import { OpenInNew } from '@material-ui/icons';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import FiberManualRecordIcon from '@material-ui/icons/FiberManualRecord';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import EmojiObjectsIcon from '@material-ui/icons/EmojiObjects';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import EmojiNatureIcon from '@material-ui/icons/EmojiNature';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import HistoryIcon from '@material-ui/icons/History';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import SettingsBrightnessIcon from '@material-ui/icons/SettingsBrightness';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import SystemUpdateAltIcon from '@material-ui/icons/SystemUpdateAlt';
// tslint:disable-next-line: no-submodule-imports match-default-export-name
import PhonelinkSetupIcon from '@material-ui/icons/PhonelinkSetup';
import ServiceManagerContext from "./ServiceManagerContext";
import DarkModeContext from "./ui/DarkModeContext";
import KindIcon from "./KindIcon";
import MakeCodeIcon from "./icons/MakeCodeIcon";
import EdgeImpulseIcon from "./icons/EdgeImpulseIcon";
import JupyterIcon from "./icons/JupyterIcon";
import JacdacIcon from "./icons/JacdacIcon";

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
    const handleClick = () => {
        setToolsMenu(false)
    }
    const handleDrawerClose = () => {
        setToolsMenu(false)
    }
    const handleDarkMode = () => {
        toggleDarkMode()
        setToolsMenu(false)
    }
    const links = [
        {
            text: "Dashboard",
            url: "/tools/dashboard",
            icon: <JacdacIcon />
        },
        {
            // separator
        },
        {
            text: "Role Manager",
            url: "/tools/role-manager",
            icon: <EmojiObjectsIcon />
        },
        {
            text: "Settings Manager",
            url: "/tools/settings-manager",
            icon: <PhonelinkSetupIcon />
        },
        {
            text: "Firmware Update",
            url: "/tools/updater",
            icon: <SystemUpdateAltIcon />
        },
        {
            // separator
        },
        {
            text: "Data collection",
            url: "/tools/collector",
            icon: <FiberManualRecordIcon />
        },
        {
            text: "Model Uploader",
            url: "/tools/model-uploader",
            icon: <EmojiNatureIcon />
        },
        {
            // separator
        },
        {
            text: "MakeCode",
            url: "/tools/makecode",
            icon: <MakeCodeIcon />
        },
        {
            text: "Edge Impulse",
            url: "/tools/edge-impulse",
            icon: <EdgeImpulseIcon />
        },
        {
            text: "Jupyter Lab",
            url: "/tools/jupyterlab",
            icon: <JupyterIcon />
        },
        /*        
                {
                    text: "Azure IoT Hub",
                    url: "/tools/azure-iot-hub",
                    icon: <CloudIcon />
                },
        */
        {
            // separator
        },
        {
            text: "Service editor",
            url: "/tools/service-editor",
            icon: <KindIcon kind={"service"} />
        },
        {
            text: "Device designer",
            url: "/tools/device-designer",
            icon: <KindIcon kind={"device"} />
        }
    ]

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
            {links.map((link, i) => link.url ? <Link to={link.url} key={link.url} onClick={handleClick}>
                <ListItem button>
                    <ListItemIcon>{link.icon}</ListItemIcon>
                    <ListItemText primaryTypographyProps={({ color: "textPrimary" })} primary={<>
                        <span>{link.text}</span>
                        {/^https:\/\//.test(link.url) && <OpenInNew fontSize="small" color="action" />}
                    </>} />
                </ListItem>
            </Link>
                : <Divider key={`div${i}`} />)}
            <Divider />
            {!isHosted &&
                <ListItem button={true} onClick={handleDarkMode} aria-label="Toggle Dark Mode">
                    <ListItemIcon><SettingsBrightnessIcon /></ListItemIcon>
                    <ListItemText>{darkMode === 'light' ? "Dark Mode" : "Light mode"}</ListItemText>
                </ListItem>}
        </List>
    </Drawer>
}