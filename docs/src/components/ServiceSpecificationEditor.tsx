import React, { useContext, useEffect } from 'react';
import { Paper, createStyles, makeStyles, Theme, Grid, TextareaAutosize, TextField } from '@material-ui/core';
import { parseSpecificationMarkdownToJSON } from '../../../jacdac-spec/spectool/jdspec'
import { clearCustomServiceSpecifications, addCustomServiceSpecification, serviceMap } from '../../../src/jdom/spec';
import RandomGenerator from './RandomGenerator';
import AppContext, { DrawerType } from './AppContext';
import ServiceSpecificationSource from './ServiceSpecificationSource';
import useLocalStorage from './useLocalStorage';
import useDebounce from 'use-debounce'
import PaperBox from './PaperBox'
import Alert from './Alert';

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

    const debouncedSource = useDebounce(source, 700)
    const includes = serviceMap()
    const json = parseSpecificationMarkdownToJSON(debouncedSource, includes)
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
                <PaperBox>
                    {source !== undefined &&
                        <TextField
                            fullWidth={true}
                            className={classes.editor}
                            onChange={handleSourceChange}
                            defaultValue={source}
                            multiline={true}
                            rows={42}
                        />}
                </PaperBox>
            </Grid>
            <Grid key="output" item xs={12} md={drawerOpen ? 12 : 5}>
                {!!annotations?.length &&
                <Alert severity="warning">
                    <ul>
                        {annotations.map(a => <li>line {a.row}: {a.text}</li>)}
                    </ul>
                </Alert>
                }
                <Paper square className={classes.segment}>
                    <RandomGenerator device={false} />
                </Paper>
                <ServiceSpecificationSource
                    serviceSpecification={json}
                    showMarkdown={false}
                    showSpecification={true} />
            </Grid>
        </Grid>
    );
}
