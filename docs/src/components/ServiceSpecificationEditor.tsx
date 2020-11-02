import React, { useContext, useEffect } from 'react';
import { Paper, createStyles, makeStyles, Theme, Grid, TextareaAutosize } from '@material-ui/core';
import { parseSpecificationMarkdownToJSON } from '../../../jacdac-spec/spectool/jdspec'
import { clearCustomServiceSpecifications, addCustomServiceSpecification, serviceMap } from '../../../src/dom/spec';
import RandomGenerator from './RandomGenerator';
import AppContext, { DrawerType } from './AppContext';
import ServiceSpecificationSource from './ServiceSpecificationSource';
import useLocalStorage from './useLocalStorage';

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
        width: "100%",
        height: "42rem"
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
    const { drawerType } = useContext(AppContext)
    const { value: source, setValue: setSource } = useLocalStorage('jacdac:servicespecificationeditorsource',
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
            clearCustomServiceSpecifications();
    }, [source])
    const annotations = json?.errors?.map(error => ({
        row: error.line,
        column: 1,
        text: error.message,
        type: 'error'
    }))
    const drawerOpen = drawerType != DrawerType.None
    const handleSourceChange = (ev: React.ChangeEvent<HTMLTextAreaElement>) => {
        setSource(ev.target.value)
    }
    return (
        <Grid spacing={2} className={classes.root} container>
            <Grid key="editor" item xs={12} md={drawerOpen ? 12 : 7}>
                <Paper square className={classes.segment}>
                    {source !== undefined &&
                        <TextareaAutosize
                            className={classes.editor}
                            onChange={handleSourceChange}
                            name="servicespecificationeditor"
                            defaultValue={source}
                            rowsMin={48}
                        />}
                </Paper>
                <Paper square className={classes.segment}>
                    <RandomGenerator device={false} />
                </Paper>
            </Grid>
            <Grid key="output" item xs={12} md={drawerOpen ? 12 : 5}>
                <ServiceSpecificationSource
                    serviceSpecification={json}
                    showMarkdown={false}
                    showSpecification={true} />
            </Grid>
        </Grid>
    );
}
