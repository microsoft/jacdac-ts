import React, { useContext, useEffect, useMemo } from 'react';
import { createStyles, makeStyles, Theme, Grid, TextareaAutosize, TextField } from '@material-ui/core';
import AppContext, { DrawerType } from '../AppContext';
import { useDebounce } from 'use-debounce/lib';
import PaperBox from '../ui/PaperBox';
import useLocalStorage from '../useLocalStorage';
import CodeBlock from '../CodeBlock';
import { toHex } from '../../../../src/jdom/utils';
import DeviceList from '../DeviceList';
import { LightCmd, LightReg, SRV_LIGHT } from '../../../../src/jdom/constants';
import ConnectAlert from '../alert/ConnectAlert';
import { serviceSpecificationFromClassIdentifier } from '../../../../src/jdom/spec';
import Markdown from "../ui/Markdown"
import useLightEncode from '../hooks/useLightEncode';

export default function LightDesigner(props: { showHelp?: boolean }) {
    const { showHelp } = props;
    const { drawerType } = useContext(AppContext)
    const { value: source, setValue: setSource } = useLocalStorage('jacdac:lightdesigner',
        `setall #00ff00
        show
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
            registerIdentifiers={[
                LightReg.NumPixels,
                LightReg.LightType,
                LightReg.Brightness,
                LightReg.ActualBrightness,
                LightReg.MaxPower]}
        />
        {showHelp && <Markdown source={spec.notes["long"]} />}
    </>);
}
