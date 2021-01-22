import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Paper, createStyles, makeStyles, Theme, Grid, TextareaAutosize, TextField, useTheme } from '@material-ui/core';
import { parseServiceSpecificationMarkdownToJSON } from '../../../../jacdac-spec/spectool/jdspec'
import { clearCustomServiceSpecifications, addCustomServiceSpecification, serviceMap } from '../../../../src/jdom/spec';
import RandomGenerator from '../RandomGenerator';
import AppContext, { DrawerType } from '../AppContext';
import ServiceSpecificationSource from '../ServiceSpecificationSource';
import useLocalStorage from '../useLocalStorage';
import { useDebounce } from 'use-debounce';
import PaperBox from '../ui/PaperBox'
import Alert from '../ui/Alert';
import GithubPullRequestButton from '../GithubPullRequestButton';

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
        backgroundColor: theme.palette.background.default,
        padding: theme.spacing(1)
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
    const { value: storedSource, setValue: setStoredSource } = useLocalStorage('jacdac:servicespecificationeditorsource',
        `# My Service

TODO: describe your service

        extends: _sensor

## Registers

    ro position: i32 @ reading

TODO describe this register
`
    )
    const [source, setSource] = useState(storedSource);
    const [debouncedSource] = useDebounce(source, 1000)
    const json = useMemo(() => parseServiceSpecificationMarkdownToJSON(debouncedSource, serviceMap()), [debouncedSource]);
    const annotations = useMemo(() => json?.errors?.map(error => ({
        row: error.line,
        column: 1,
        text: error.message,
        type: 'error'
    })), [json])
    useEffect(() => {
        setStoredSource(debouncedSource)
        addCustomServiceSpecification(json)
        if (json.classIdentifier)
            clearCustomServiceSpecifications();
    }, [debouncedSource])
    const drawerOpen = drawerType != DrawerType.None
    const handleSourceChange = (ev: React.ChangeEvent<HTMLTextAreaElement>) => {
        setSource(ev.target.value)
    }
    const servicePath = json && `services/${(json.camelName || json.shortId || `0x${json.classIdentifier.toString(16)}`).toLowerCase()}`
    return (
        <Grid spacing={2} className={classes.root} container>
            <Grid key="editor" item xs={12} md={drawerOpen ? 12 : 7}>
                <TextField
                    fullWidth={true}
                    className={classes.editor}
                    onChange={handleSourceChange}
                    defaultValue={source || ""}
                    multiline={true}
                    rows={42}
                    spellCheck={false}
                    inputProps={{
                        fontFamily: 'monospace'
                    }}
                />
                <GithubPullRequestButton
                    label={"submit service"}
                    title={json && `Service: ${json.name}`}
                    head={json && servicePath}
                    body={`This pull request adds a new service definition for JACDAC.`}
                    commit={json && `added service files`}
                    files={servicePath && {
                        [servicePath + ".md"]: debouncedSource
                    }}
                />
            </Grid>
            <Grid key="output" item xs={12} md={drawerOpen ? 12 : 5}>
                {!!annotations?.length &&
                    <Alert severity="warning">
                        <ul>
                            {annotations.map((a, i) => <li key={i}>line {a.row}: {a.text}</li>)}
                        </ul>
                    </Alert>
                }
                <Paper square className={classes.segment}>
                    <RandomGenerator device={false} />
                </Paper>
            </Grid>
        </Grid>
    );
}
