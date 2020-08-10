import React, { useState } from 'react';
// tslint:disable-next-line: no-submodule-imports
import { makeStyles, Theme } from '@material-ui/core/styles';
// tslint:disable-next-line: no-submodule-imports
import Tabs from '@material-ui/core/Tabs';
// tslint:disable-next-line: no-submodule-imports
import Tab from '@material-ui/core/Tab';
import { serviceSpecificationFromClassIdentifier } from '../../../src/dom/spec';
import { Paper } from '@material-ui/core';
import TabPanel, { a11yProps } from './TabPanel';

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
    const [value, setValue] = useState(0);
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
