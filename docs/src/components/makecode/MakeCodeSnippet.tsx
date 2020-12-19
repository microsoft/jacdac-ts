import React, { useState, useEffect, useMemo, useRef, useContext } from "react";
import useEffectAsync from "../useEffectAsync"
import PaperBox from "../PaperBox"
import { createStyles, makeStyles, NoSsr, Tab, Tabs, useTheme } from '@material-ui/core';
import CodeBlock from "../CodeBlock";
import TabPanel from '../TabPanel';
import { Skeleton } from "@material-ui/lab";
import { unique } from "../../../../src/jdom/utils";
import { makeCodeServices } from "../../../../src/jdom/spec"
import MakeCodeSnippetContext from "./MakeCodeSnippetContext";
import { MakeCodeSnippetRendered, MakeCodeSnippetSource, parseMakeCodeSnippet } from "./useRenderer";

const useStyles = makeStyles(() => createStyles({
    img: {
        marginBottom: 0
    }
}));

function MakeCodeSnippetTab(props: { snippet: MakeCodeSnippetSource }) {
    const { snippet } = props;
    const { code, meta } = snippet;
    const { render } = useContext(MakeCodeSnippetContext)
    const [state, setState] = useState<MakeCodeSnippetRendered>({})
    const { uri, width, height } = state;
    const theme = useTheme();
    const classes = useStyles();

    useEffectAsync(async (mounted) => {
        const resp = await render(snippet)
        if (mounted())
            setState(resp);
    }, [snippet])

    return <>
        {!uri && <Skeleton variant="rect" animation="wave" width={"100%"} height={theme.spacing(5)} />}
        {uri && <img className={classes.img} alt={code} src={uri} width={width} height={height} />}
    </>
}

function MakeCodeSnippetNoSSR(props: { source: string }) {
    const { source } = props;
    const tabs = ["blocks", "typescript"]
    const { editor, setEditor } = useContext(MakeCodeSnippetContext);
    const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
        setEditor(tabs[newValue]);
    };
    const snippet = useMemo(() => parseMakeCodeSnippet(source), [source]);
    const { code } = snippet;
    const tab = tabs.indexOf(editor);

    return <PaperBox>
        <Tabs value={tab} onChange={handleTabChange} aria-label="Select MakeCode editor">
            <Tab label={"Blocks"} />
            <Tab label={"JavaScript"} />
        </Tabs>
        <TabPanel value={tab} index={0}>
            <MakeCodeSnippetTab snippet={snippet} />
        </TabPanel>
        <TabPanel value={tab} index={1}>
            <CodeBlock className="typescript">{code}</CodeBlock>
        </TabPanel>
    </PaperBox>
}

export default function MakeCodeSnippetBox(props: { source: string }) {
    return <NoSsr>
        <MakeCodeSnippetNoSSR {...props} />
    </NoSsr>
}