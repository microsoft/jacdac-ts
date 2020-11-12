import React, { useState } from 'react';
// tslint:disable-next-line: no-submodule-imports
import Tabs from '@material-ui/core/Tabs';
// tslint:disable-next-line: no-submodule-imports
import Tab from '@material-ui/core/Tab';
import { serviceSpecificationFromClassIdentifier } from '../../../src/jdom/spec';
import { Paper, createStyles, makeStyles, Theme } from '@material-ui/core';
import TabPanel, { a11yProps } from './TabPanel';
import Snippet from './Snippet';
import { converters } from '../../../jacdac-spec/spectool/jdspec'
import ServiceSpecification from './ServiceSpecification';

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

export default function ServiceSpecificationSource(props: {
    classIdentifier?: number,
    serviceSpecification?: jdspec.ServiceSpec,
    showMarkdown?: boolean,
    showSpecification?: boolean
}) {
    const { classIdentifier, serviceSpecification, showMarkdown, showSpecification } = props;
    const classes = useStyles();
    const [tab, setTab] = useState(0);
    const spec = serviceSpecification || serviceSpecificationFromClassIdentifier(classIdentifier)
    const convs = converters();

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
                        "TypeScript",
                        "C",
                        "JSON"].filter(n => !!n)
                        .map((n, i) => <Tab key={n} label={n} {...a11yProps(i)} />)}
                </Tabs>
                {showMarkdown && <TabPanel value={tab} index={index++}>
                    <Snippet value={spec.source} mode="markdown" />
                </TabPanel>}
                {showSpecification && <TabPanel key="spec" value={tab} index={index++}>
                    <ServiceSpecification service={spec} />
                </TabPanel>}
                {["ts", "c", "json"].map((lang, i) =>
                    <TabPanel key={`conv${lang}`} value={tab} index={i + 1}>
                        <Snippet value={convs[lang](spec)} mode={lang} />
                    </TabPanel>)}
            </Paper>
        </div>
    );
}
