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
    pre: {
        margin: "0",
        padding: "0",
        backgroundColor: "transparent",
        whiteSpec: "pre-wrap",
        flexGrow: 1
    }
}));

function useLightEncode(source: string) {
    return useMemo(() => {
        let encoded: string;
        let error: string;
        try {
            encoded = toHex(lightEncode(source, []))
        } catch (e: unknown) {
            error = (e as any)?.message || (e + "");
        }
        return { encoded, error }
    }, [source])
}

export default function LightDesigner() {
    const classes = useStyles();
    const { drawerType } = useContext(AppContext)
    const { value: source, setValue: setSource } = useLocalStorage('jacdac:lightdesigner',
        `fadehsv 0 12 #00ffff #ffffff
`
    )

    const [debouncedSource] = useDebounce(source, 700)
    const { encoded, error } = useLightEncode(debouncedSource);
    const drawerOpen = drawerType != DrawerType.None
    const handleSourceChange = (ev: React.ChangeEvent<HTMLTextAreaElement>) => {
        setSource(ev.target.value)
    }
    return (
        <Grid spacing={2} container>
            <Grid key="editor" item xs={12} md={drawerOpen ? 12 : 7}>
                <PaperBox>
                    {source !== undefined &&
                        <TextField
                            spellCheck={false}
                            fullWidth={true}
                            onChange={handleSourceChange}
                            defaultValue={source}
                            helperText={error}
                            error={!!error}
                        />}
                </PaperBox>
            </Grid>
            <Grid key="output" item xs={12} md={drawerOpen ? 12 : 5}>
                {encoded && <CodeBlock>{encoded}</CodeBlock>}
            </Grid>
        </Grid>
    );
}
