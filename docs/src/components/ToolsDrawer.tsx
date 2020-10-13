import React, { useContext } from "react";
import { Drawer, makeStyles, createStyles, List, ListItemIcon, ListItemText, Typography, ListItem, Divider, SvgIcon } from "@material-ui/core";
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

const JupyterIcon = (props: any) => <SvgIcon {...props}>
    <g transform="scale(0.046, 0.046)">
        <path d="M363.1749878,34.3386345c0.8400269,19.7925911-14.3702087,36.5211449-33.9805298,37.3691826c-19.6002808,0.8480377-36.1755371-14.5075035-37.015564-34.3000946S306.5491333,0.8815286,326.1544189,0.033491S362.3349609,14.5460396,363.1749878,34.3386345 M193.5356445,384.5007019c-78.2163391,0-146.3281555-28.4102173-181.7874756-70.3781433c26.833786,75.240448,98.0906677,129.0350952,181.7874756,129.0350952s154.9537048-53.7946472,181.7874756-129.0350952C339.8638,356.0904846,271.7519836,384.5007019,193.5356445,384.5007019 M193.5356445,111.3343964c78.2163391,0,146.3281555,28.4065704,181.7874756,70.3781586c-26.8337708-75.2404785-98.0906677-129.0387421-181.7874756-129.0387421S38.581955,106.4720764,11.7481689,181.7125549C47.2074814,139.7409668,115.3193054,111.3343964,193.5356445,111.3343964 M101.3917084,467.5608215c0.996994,23.5126343-17.0774078,43.38797-40.3688049,44.3994751c-23.2914047,1.0064392-42.9797745-17.239624-43.9767761-40.7522583c-1.0019455-23.5126343,17.072464-43.3930054,40.3638611-44.3994751C80.7013855,425.802124,100.3946991,444.0481873,101.3917084,467.5608215 M26.9179688,95.017662C12.6761246,95.6327286,0.6337129,84.4763947,0.0244142,70.0946655c-0.6142578-14.3767166,10.4374084-26.5331802,24.6842041-27.1482506c14.2418442-0.6150742,26.2842484,10.5412636,26.8935547,24.9179802C52.2164307,82.2461243,41.1598053,94.4025803,26.9179688,95.017662z" />
    </g>
</SvgIcon>
const EdgeImpulse = (props: any) => <SvgIcon {...props}>
<path d="M15.659 10.429a1.617 1.617 0 100 3.236h5.348l-1.23-3.235h-4.118z" /><path d="M3.28 13.663h7.85a1.617 1.617 0 100-3.236H3.28a1.617 1.617 0 100 3.236z" /><path d="M21.832 16.023H5.105a2.298 2.298 0 100 2.951h17.85z" /><path d="M17.81 5.068H5.139A2.3 2.3 0 103.344 8.8c.687 0 1.3-.303 1.721-.78h13.868z" />
</SvgIcon>

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
    const links = [
        {
            text: "Role Manager",
            url: "/tools/role-manager",
            icon: <EmojiObjectsIcon />
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
            text: "Edge Impulse",
            url: "/tools/edge-impulse",
            icon: <EdgeImpulse />
        },
        {
            text: "Jupyter Lab",
            url: "https://mybinder.org/v2/gh/microsoft/jupyter-jacdac/main?urlpath=lab",
            icon: <JupyterIcon />
        },
        {
            // separator
        },
        {
            text: "Firmware Update",
            url: "/tools/updater",
            icon: <LineWeightIcon />
        },
        {
            text: "Packet inspector",
            url: "/tools/packet-inspector",
            icon: <HistoryIcon />
        },
        {
            text: "Service specification editor",
            url: "/tools/service-editor",
            icon: <EditIcon />
        },
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
            {links.map(link => link.url ? <Link to={link.url} key={link.url}>
                <ListItem button>
                    <ListItemIcon>{link.icon}</ListItemIcon>
                    <ListItemText primaryTypographyProps={({ color: "textPrimary" })} primary={link.text} />
                </ListItem>
            </Link>
                : <Divider />)}
            <Divider />
            {!isHosted &&
                <ListItem button={true} onClick={handleDarkMode} aria-label="Toggle Dark Mode">
                    <ListItemIcon><SettingsBrightnessIcon /></ListItemIcon>
                    <ListItemText>{darkMode === 'light' ? "Dark Mode" : "Light mode"}</ListItemText>
                </ListItem>}
        </List>
    </Drawer>
}