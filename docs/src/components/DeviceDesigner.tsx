import React, { useContext, useEffect, useMemo } from 'react';
import { Paper, createStyles, makeStyles, Theme, Grid, TextareaAutosize, TextField } from '@material-ui/core';
import { parseDeviceMarkdownToJSON } from '../../../jacdac-spec/spectool/devices'
import RandomGenerator from './RandomGenerator';
import AppContext, { DrawerType } from './AppContext';
import useLocalStorage from './useLocalStorage';
import { useDebounce } from 'use-debounce';
import PaperBox from './PaperBox'
import Alert from './Alert';
import { deviceSpecifications } from '../../../src/jdom/spec';
import DeviceSpecificationSource from "./DeviceSpecificationSource"

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

export default function DeviceDesigner() {
    const classes = useStyles();
    const { drawerType } = useContext(AppContext)
    const { value: source, setValue: setSource } = useLocalStorage('jacdac:devicedesigner',
        `# My Device

TODO: describe your device

* services:
* firmware:

`
    )

    const [debouncedSource] = useDebounce(source, 700)
    const usedIds: jdspec.SMap<string> = useMemo(() => {
        const r = {};
        deviceSpecifications().forEach(dev => r[dev.id] = dev.name);
        return r
    }, []);
    const device = parseDeviceMarkdownToJSON(debouncedSource, undefined, usedIds,)
    const annotations = device?.errors?.map(error => ({
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
                    <RandomGenerator device={true} />
                </Paper>
                <DeviceSpecificationSource deviceSpecification={device} showMarkdown={true} showDTDL={true} />
            </Grid>
        </Grid>
    );
}
