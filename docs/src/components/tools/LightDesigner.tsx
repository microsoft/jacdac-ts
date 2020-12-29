import React, { useContext, useEffect, useMemo } from 'react';
import { createStyles, makeStyles, Theme, Grid, TextareaAutosize, TextField } from '@material-ui/core';
import AppContext, { DrawerType } from '../AppContext';
import { useDebounce } from 'use-debounce/lib';
import PaperBox from '../ui/PaperBox';
import useLocalStorage from '../useLocalStorage';
import CodeBlock from '../CodeBlock';
import { toHex } from '../../../../src/jdom/utils';
import { lightEncode } from '../../../../src/jdom/light'
import DeviceList from '../DeviceList';
import { LightCmd, LightReg, SRV_LIGHT } from '../../../../src/jdom/constants';
import ConnectAlert from '../ConnectAlert';
import { serviceSpecificationFromClassIdentifier } from '../../../../src/jdom/spec';
import Markdown from "../ui/Markdown"

function useLightEncode(source: string) {
    return useMemo(() => {
        let encoded: Uint8Array;
        let error: string;
        try {
            encoded = lightEncode(source, [])
        } catch (e: unknown) {
            error = (e as any)?.message || (e + "");
        }
        return { encoded, error }
    }, [source])
}

export default function LightDesigner(props: { showHelp?: boolean }) {
    const { showHelp } = props;
    const { drawerType } = useContext(AppContext)
    const { value: source, setValue: setSource } = useLocalStorage('jacdac:lightdesigner',
        `fadehsv 0 12 #00ffff #ffffff
`
    )
    const [debouncedSource] = useDebounce(source, 700)
    const { encoded, error } = useLightEncode(debouncedSource);
    const handleSourceChange = (ev: React.ChangeEvent<HTMLTextAreaElement>) => {
        setSource(ev.target.value)
    }
    const spec = serviceSpecificationFromClassIdentifier(SRV_LIGHT);
    return (<>
        <Grid spacing={2} container>
            <Grid key="editor" item xs={12} md={6}>
                <PaperBox>
                    {source !== undefined &&
                        <TextField
                            spellCheck={false}
                            fullWidth={true}
                            onChange={handleSourceChange}
                            defaultValue={source}
                            helperText={error}
                            error={!!error}
                            multiline={true}
                            rows={10}
                        />}
                </PaperBox>
            </Grid>
            <Grid key="output" item xs={12} md={6}>
                {encoded && <CodeBlock>{toHex(encoded)}</CodeBlock>}
            </Grid>
        </Grid>
        <ConnectAlert />
        <DeviceList
            serviceClass={SRV_LIGHT}
            showMemberName={true}
            commandIdentifier={LightCmd.Run}
            commandArgs={encoded && [encoded]}
        />
        <DeviceList
            serviceClass={SRV_LIGHT}
            showMemberName={true}
            registerIdentifier={LightReg.NumPixels}
        />
        <DeviceList
            serviceClass={SRV_LIGHT}
            showMemberName={true}
            registerIdentifier={LightReg.Brightness}
        />
        <DeviceList
            serviceClass={SRV_LIGHT}
            showMemberName={true}
            registerIdentifier={LightReg.MaxPower}
        />
        {showHelp && <Markdown source={spec.notes["long"]} />}
    </>);
}
