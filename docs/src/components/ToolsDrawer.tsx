import React, { useContext } from "react";
import { Drawer, makeStyles, createStyles, List, ListItemIcon, ListItemText, Typography, ListItem, Divider, SvgIcon, Box, useTheme } from "@material-ui/core";
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
import EditIcon from '@material-ui/icons/Edit';
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
const MakeCode = (props: any) => <SvgIcon {...props}>
<path d="M4.703 2.615s-.505.05-.72.15a3.011 3.011 0 00-.391.221c-.22.12-.42.266-.6.444-.52.516-.795 1.2-.834 2.05a6.857 6.857 0 00-.066.961V8.36a5.117 5.117 0 01-.137 1.032 1.73 1.73 0 01-.4.773 2.006 2.006 0 00-.15.149 6.534 6.534 0 01-.848.617c-.303.196-.481.474-.537.83v.017c-.01.07-.017.14-.018.215L0 12.006v.008c0 .08.003.156.012.226h.002c.024.214.082.378.177.492.129.153.345.328.649.52.304.192.552.398.74.62.19.221.332.549.428.985.037.17.065.54.084 1.106v1.514c0 .285.023.542.056.787.001.047 0 .092.002.14.007.587.135 1.107.385 1.559.25.453.604.803 1.063 1.05.458.248.978.372 1.56.372h14.139c.262 0 .505-.05.72-.15.139-.064.267-.14.391-.221.218-.12.42-.266.6-.444.52-.516.795-1.2.834-2.05.042-.299.066-.618.066-.963v-1.918c.014-.372.059-.715.137-1.03.078-.314.213-.572.4-.775a1.98 1.98 0 00.15-.146c.2-.179.48-.384.848-.618.303-.196.481-.475.537-.832l.002-.015a1.66 1.66 0 00.018-.217V11.988c0-.08-.004-.156-.012-.226h-.002c-.024-.214-.082-.378-.177-.492-.129-.153-.345-.328-.649-.52a3.208 3.208 0 01-.74-.62c-.19-.221-.332-.55-.428-.987-.037-.17-.065-.538-.084-1.104V6.523c0-.285-.023-.542-.056-.787-.001-.047 0-.092-.002-.14-.007-.587-.135-1.107-.385-1.559a2.598 2.598 0 00-1.063-1.05c-.458-.248-.978-.372-1.56-.372H4.703zm1.22 1.24c.307 0 .533.058.673.172.115.096.168.24.168.453a.885.885 0 01-.069.36.501.501 0 01-.142.201.346.346 0 01-.18.07c-.31.042-.543.095-.713.164a1.03 1.03 0 00-.543.536c-.093.201-.149.47-.174.818-.022.301-.033.725-.033 1.293-.012.796-.058 1.422-.137 1.861-.07.398-.206.74-.4 1.02-.197.282-.499.552-.898.804l-.616.39.618.386c.286.18.52.368.695.558.166.18.304.407.414.672.115.277.2.614.248 1.004.051.413.076.908.076 1.47 0 .587.013 1.025.037 1.34.03.367.094.64.196.835.123.236.303.403.537.496.168.067.395.114.693.148a.404.404 0 01.268.16c.081.1.123.259.123.471 0 .308-.064.608-.84.608-.477 0-.898-.094-1.25-.282a2.006 2.006 0 01-.813-.785 2.402 2.402 0 01-.31-1.197c-.048-2.666-.098-3.199-.139-3.37-.115-.472-.286-.83-.525-1.097a3.373 3.373 0 00-.776-.633c-.216-.13-.375-.254-.47-.369-.027-.032-.088-.136-.088-.416 0-.288.09-.471.293-.596.454-.28.781-.522.998-.746.244-.251.415-.565.51-.931.084-.328.132-.788.148-1.407.015-.58.03-1.305.049-2.177.016-.706.229-1.25.654-1.666.426-.416.988-.618 1.719-.618zm12.153 0c.477 0 .898.095 1.25.282.348.185.612.442.813.785.2.343.305.746.31 1.197.048 2.666.098 3.199.139 3.37.115.472.286.83.525 1.097.216.24.476.452.776.633.217.131.376.255.47.369.027.032.088.136.088.416 0 .287-.09.471-.293.596-.454.28-.78.522-.998.746-.243.25-.415.565-.51.931-.084.328-.132.788-.148 1.407-.015.58-.03 1.305-.049 2.177-.016.706-.229 1.25-.654 1.666-.426.416-.988.618-1.719.618-.307 0-.533-.058-.672-.172-.116-.096-.168-.24-.168-.453 0-.135.021-.253.069-.36a.512.512 0 01.14-.201.353.353 0 01.182-.07c.31-.042.543-.095.713-.164.238-.099.424-.284.54-.538.094-.201.152-.468.177-.816.021-.301.033-.727.033-1.295.012-.796.058-1.42.137-1.86.07-.397.204-.74.398-1.019.196-.281.499-.552.898-.804l.616-.39-.616-.386a3.412 3.412 0 01-.695-.558 2.275 2.275 0 01-.416-.672 3.871 3.871 0 01-.246-1.004 12.22 12.22 0 01-.078-1.47c0-.587-.012-1.025-.037-1.34-.03-.367-.092-.64-.194-.835a1.021 1.021 0 00-.539-.496 2.76 2.76 0 00-.691-.148.4.4 0 01-.268-.16c-.082-.1-.123-.259-.123-.471 0-.308.064-.608.84-.608zm-6.29 1.348c.052-.005.341-.005.394 0v.01a1.524 1.524 0 011.287 1.457c0 .62-.332.891-.332.916-.33.346-.123.744.467.695 0 0 2.4.012 2.445 0a.576.576 0 01.422.555l-.002 2.574c-.106.3-.396.36-.658.111-.025 0-.296-.332-.916-.332a1.521 1.521 0 00-1.457 1.286h-.008a4.897 4.897 0 000 .394h.008a1.524 1.524 0 001.457 1.287c.62 0 .89-.332.916-.332.27-.256.557-.225.658.112v2.783a.562.562 0 01-.563.562H8.061a.561.561 0 01-.563-.562V8.836c0-.261.18-.492.422-.555.046.012 2.443 0 2.443 0 .659.032.798-.349.469-.695 0-.025-.332-.296-.332-.916a1.521 1.521 0 011.285-1.457v-.01z" id="path10" strokeWidth=".75"/>
</SvgIcon>

export default function ToolsDrawer() {
    const classes = useStyles()
    const theme = useTheme();
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
            text: "MakeCode",
            url: "https://makecode.com/multi?jacdac=1",
            icon: <MakeCode />
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
            {links.map((link, i) => link.url ? <Link to={link.url} key={link.url}>
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