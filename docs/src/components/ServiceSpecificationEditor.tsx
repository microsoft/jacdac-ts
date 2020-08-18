import React, { useState } from 'react';
import { Paper, createStyles, makeStyles, Theme, Grid, TextField, Typography } from '@material-ui/core';
import { parseSpecificationMarkdownToJSON, converters } from '../../../jacdac-spec/spectool/jdspec'
import AceEditor from "react-ace";

import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/ext-language_tools"
import { serviceSpecificationFromName } from '../../../src/dom/spec';

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
        whiteSpec: "pre-wrap",
        flexGrow: 1
    }
}));

export default function ServiceSpecificationEditor() {
    const classes = useStyles();
    const [source, setSource] = useState(
        `# My Service

TODO: describe your service

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

    return (
        <Grid spacing={2} className={classes.root} container>
            <Grid key="editor" item xs={12} md={8}>
                <Typography variant="h5">Markdown Specification</Typography>
                <Paper square>
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
            </Grid>
            <Grid key="output" item xs={12} md={4}>
            <Typography variant="h5">JSON</Typography>
                <Paper square>
                    <pre>{JSON.stringify(json, null, 2)}</pre>
                </Paper>
            </Grid>
        </Grid>
    );
}
