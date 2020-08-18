import React, { useState, useContext } from 'react';
import { Paper, createStyles, makeStyles, Theme, Grid, TextField, Typography, Tabs, Tab } from '@material-ui/core';
import { parseSpecificationMarkdownToJSON, converters } from '../../../jacdac-spec/spectool/jdspec'
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/ext-language_tools"
import { serviceSpecificationFromName } from '../../../src/dom/spec';
import TabPanel, { a11yProps } from './TabPanel';
import ServiceSpecification from './ServiceSpecification';
import RandomGenerator from './RandomGenerator';

const useStyles = makeStyles((theme: Theme) => createStyles({
    root: {
        flexGrow: 1,
        backgroundColor: theme.palette.background.paper,
        marginBottom: theme.spacing(1)
    },
    segment: {
        marginBottom: theme.spacing(2)
    },
    pre: {
        margin: "0",
        padding: "0",
        backgroundColor: "transparent",
        whiteSpec: "pre-wrap",
        flexGrow: 1
    }
}));

export default function ServiceSpecificationEditor() {
    const classes = useStyles();
    const [tab, setTab] = useState(0);
    const [source, setSource] = useState(
        `# My Service

TODO: describe your service

        extends: _sensor

## Registers

    ro position: i32 @ reading

TODO describe this register
`
    )

    const includes = {
        "_base": serviceSpecificationFromName("_base"),
        "_sensor": serviceSpecificationFromName("_sensor")
    }
    const json = parseSpecificationMarkdownToJSON(source, includes)
    const annotations = json?.errors?.map(error => ({
        row: error.line,
        column: 1,
        text: error.message,
        type: 'error'
    }))

    const handleSourceChange = (newValue: string) => {
        setSource(newValue)
    }
    const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
        setTab(newValue);
    };
    return (
        <Grid spacing={2} className={classes.root} container>
            <Grid key="editor" item xs={12} md={6}>
                <Paper square className={classes.segment}>
                    <AceEditor
                        mode="markdown"
                        theme="github"
                        value={source}
                        onChange={handleSourceChange}
                        name="markdowneditor"
                        wrapEnabled={true}
                        debounceChangePeriod={500}
                        editorProps={{ $blockScrolling: true }}
                        minLines={18}
                        annotations={annotations}
                        setOptions={{
                            enableBasicAutocompletion: true,
                            enableLiveAutocompletion: true,
                        }}
                    />
                </Paper>
                <Paper square className={classes.segment}>
                    <RandomGenerator device={false} />
                </Paper>
            </Grid>
            <Grid key="output" item xs={12} md={6}>
                <Tabs value={tab} onChange={handleTabChange} aria-label="View specification formats">
                    <Tab label="Specification" {...a11yProps(0)} />
                    <Tab label="JSON" {...a11yProps(1)} />
                </Tabs>
                <TabPanel value={tab} index={0}>
                    {json && <ServiceSpecification service={json} />}
                </TabPanel>
                <TabPanel value={tab} index={1}>
                    <pre>{JSON.stringify(json, null, 2)}</pre>
                </TabPanel>
            </Grid>
        </Grid>
    );
}
