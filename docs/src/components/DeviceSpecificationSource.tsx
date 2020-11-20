import React, { useMemo, useState } from 'react';
// tslint:disable-next-line: no-submodule-imports
import Tabs from '@material-ui/core/Tabs';
// tslint:disable-next-line: no-submodule-imports
import Tab from '@material-ui/core/Tab';
import { Paper, createStyles, makeStyles, Theme } from '@material-ui/core';
import TabPanel, { a11yProps } from './TabPanel';
import Snippet from './Snippet';
import DeviceSpecification from './DeviceSpecification';
import { DeviceDTDLSnippet } from './DeviceDTDLSnippet';
import { deviceSpecificationToMarkdown } from '../../../src/jdom/spec';

const useStyles = makeStyles((theme: Theme) => createStyles({
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

export default function DeviceSpecificationSource(props: {
    deviceSpecification?: jdspec.DeviceSpec,
    showMarkdown?: boolean,
    showSpecification?: boolean,
    showDTDL?: boolean,
    showJSON?: boolean
}) {
    const { deviceSpecification, showMarkdown, showSpecification, showDTDL, showJSON } = props;
    const classes = useStyles();
    const [tab, setTab] = useState(0);
    const spec = deviceSpecification

    const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
        setTab(newValue);
    };

    let index = 0;
    return (
        <div className={classes.root}>
            <Paper square>
                <Tabs value={tab} onChange={handleTabChange} aria-label="View specification formats">
                    {[
                        showMarkdown && "Markdown",
                        showSpecification && "Specification",
                        showMarkdown && "JSON",
                        showDTDL && "DTDL",
                    ].filter(n => !!n)
                        .map((n, i) => <Tab key={n} label={n} {...a11yProps(i)} />)}
                </Tabs>
                {showMarkdown && <TabPanel value={tab} index={index++}>
                    <Snippet value={deviceSpecification.source || deviceSpecificationToMarkdown(deviceSpecification)} mode="markdown" download={`${spec.name || "device"}.md`} />
                </TabPanel>}
                {showSpecification && <TabPanel key="spec" value={tab} index={index++}>
                    <DeviceSpecification device={spec} />
                </TabPanel>}
                {showJSON && <TabPanel key={`convjson`} value={tab} index={index++}>
                    <Snippet value={JSON.stringify(spec, null, 2)} mode={"json"} />
                </TabPanel>}
                {showDTDL && <TabPanel key="dtdl" value={tab} index={index++}>
                    <DeviceDTDLSnippet dev={deviceSpecification} />
                </TabPanel>}
            </Paper>
        </div>
    );
}
