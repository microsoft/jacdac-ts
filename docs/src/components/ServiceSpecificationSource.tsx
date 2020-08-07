import React from 'react';
import { makeStyles, Theme } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import { serviceSpecificationFromClassIdentifier } from '../../../src/dom/spec';
import { Paper } from '@material-ui/core';

interface TabPanelProps {
    children?: React.ReactNode;
    index: any;
    value: any;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box p={3}>
                    <Typography>{children}</Typography>
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: any) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        flexGrow: 1,
        backgroundColor: theme.palette.background.paper,
        marginBottom: theme.spacing(1)
    },
    pre: {
        margin: "0",
        padding: "0",
        backgroundColor: "transparent",
        whiteSpec: "pre-wrap"
    }
}));

export default function ServiceSpecificationSource(props: { classIdentifier: number }) {
    const { classIdentifier } = props;
    const classes = useStyles();
    const [value, setValue] = React.useState(0);
    const spec = serviceSpecificationFromClassIdentifier(classIdentifier)

    const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
        setValue(newValue);
    };

    return (
        <div className={classes.root}>
            <Paper square>
                <Tabs value={value} onChange={handleChange} aria-label="View specification formats">
                    <Tab label="Markdown" {...a11yProps(0)} />
                    <Tab label="JSON" {...a11yProps(1)} />
                </Tabs>
                {[spec.source, JSON.stringify(spec, null, 2)].map((src, index) => <TabPanel value={value} index={index}>
                    <pre className={classes.pre}>{src}</pre>
                </TabPanel>)}
            </Paper>
        </div>
    );
}
