import React, { useContext, useEffect, useMemo } from 'react';
import { createStyles, makeStyles, Theme, Grid, TextareaAutosize, TextField } from '@material-ui/core';
import AppContext, { DrawerType } from './AppContext';
import { useDebounce } from 'use-debounce/lib';
import PaperBox from './PaperBox';
import useLocalStorage from './useLocalStorage';
import CodeBlock from './CodeBlock';
import { toHex } from '../../../src/jdom/utils';
import { lightEncode } from '../../../src/jdom/light'

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

export default function LightDesigner() {
    const classes = useStyles();
    const { drawerType } = useContext(AppContext)
    const { value: source, setValue: setSource } = useLocalStorage('jacdac:lightdesigner',
        `fadehsv 0 12 #00ffff #ffffff
`
    )

    const [debouncedSource] = useDebounce(source, 700)
    const encoded = useMemo(() => {
        try {
            return toHex(lightEncode(debouncedSource, []))
        } catch (e: unknown) {
            return (e as any)?.message || (e + "");
        }
    }, [debouncedSource]);
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
                        />}
                </PaperBox>
            </Grid>
            <Grid key="output" item xs={12} md={drawerOpen ? 12 : 5}>
                {encoded && <CodeBlock>{encoded}</CodeBlock>}
            </Grid>
        </Grid>
    );
}
