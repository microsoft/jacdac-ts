import React, { useState, useContext, useEffect } from 'react';
import { Paper, createStyles, makeStyles, Theme, Grid } from '@material-ui/core';
import { parseSpecificationMarkdownToJSON, converters } from '../../../jacdac-spec/spectool/jdspec'
// tslint:disable-next-line: match-default-export-name
import AceEditor from "react-ace";

// tslint:disable-next-line: no-import-side-effect no-submodule-imports
import "ace-builds/src-noconflict/mode-markdown";
// tslint:disable-next-line: no-import-side-effect no-submodule-imports
import "ace-builds/src-noconflict/mode-json";
// tslint:disable-next-line: no-import-side-effect no-submodule-imports
import "ace-builds/src-noconflict/mode-javascript";
// tslint:disable-next-line: no-import-side-effect no-submodule-imports
import "ace-builds/src-noconflict/theme-github";
// tslint:disable-next-line: no-import-side-effect no-submodule-imports
import "ace-builds/src-noconflict/ext-language_tools"
import { clearCustomServiceSpecifications, addCustomServiceSpecification, serviceMap } from '../../../src/dom/spec';
import RandomGenerator from './RandomGenerator';
import { useDbValue } from './DbContext';
import DrawerContext, { DrawerType } from './DrawerContext';
import PacketFilterContext from './PacketFilterContext';
import ServiceSpecificationSource from './ServiceSpecificationSource';

const useStyles = makeStyles((theme: Theme) => createStyles({
    root: {
        flexGrow: 1,
        backgroundColor: theme.palette.background.paper,
        marginBottom: theme.spacing(1)
    },
    segment: {
        marginBottom: theme.spacing(2)
    },
    editor: {
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
    const [, setTab] = useState(0);
    const { drawerType } = useContext(DrawerContext)
    const { setServiceClass } = useContext(PacketFilterContext)
    const { value: source, setValue: setSource } = useDbValue('servicespecificationeditor',
        `# My Service

TODO: describe your service

        extends: _sensor

## Registers

    ro position: i32 @ reading

TODO describe this register
`
    )
    const includes = serviceMap()
    const json = parseSpecificationMarkdownToJSON(source, includes)
    useEffect(() => {
        addCustomServiceSpecification(json)
        if (json.classIdentifier)
            setServiceClass(json.classIdentifier)
        return () => {
            setServiceClass(undefined)
            clearCustomServiceSpecifications();
        }
    }, [source])
    const annotations = json?.errors?.map(error => ({
        row: error.line,
        column: 1,
        text: error.message,
        type: 'error'
    }))
    const drawerOpen = drawerType != DrawerType.None
    const handleSourceChange = (newValue: string) => {
        setSource(newValue)
    }
    return (
        <Grid spacing={2} className={classes.root} container>
            <Grid key="editor" item xs={12} md={drawerOpen ? 12 : 6}>
                <Paper square className={classes.segment}>
                    <AceEditor
                        className={classes.editor}
                        mode="markdown"
                        theme="github"
                        width="100%"
                        height="42rem"
                        value={source}
                        onChange={handleSourceChange}
                        name="servicespecificationeditor"
                        wrapEnabled={true}
                        debounceChangePeriod={500}
                        editorProps={{ $blockScrolling: true }}
                        annotations={annotations}
                        minLines={48}
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
            <Grid key="output" item xs={12} md={drawerOpen ? 12 : 6}>
                <ServiceSpecificationSource
                    serviceSpecification={json}
                    showMarkdown={false}
                    showSpecification={true} />
            </Grid>
        </Grid>
    );
}
