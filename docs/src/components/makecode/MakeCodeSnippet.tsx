import React, { useState, useEffect, useMemo, useRef } from "react";
import useEffectAsync from "../useEffectAsync"
import PaperBox from "../PaperBox"
import { createStyles, makeStyles, NoSsr, Tab, Tabs, useTheme } from '@material-ui/core';
import CodeBlock from "../CodeBlock";
import TabPanel from '../TabPanel';
import { Skeleton } from "@material-ui/lab";

const useStyles = makeStyles(() => createStyles({
    img: {
        marginBottom: 0
    }
}));

interface RenderBlocksRequestMessage {
    type: "renderblocks",
    id: string;
    code: string;
    options?: {
        packageId?: string;
        package?: string;
        snippetMode?: boolean;
        dependencies?: string[];
    }
}

interface RenderBlocksResponseMessage {
    source: "makecode",
    type: "renderblocks",
    id: string;
    uri?: string;
    css?: string;
    svg?: string;
    width?: number;
    height?: number;
    error?: string;
}

interface RenderBlocksRequentResponse {
    req: RenderBlocksRequestMessage,
    resolve: (resp: RenderBlocksResponseMessage) => void,
    reject: (e: unknown) => void
}

export function useRenderer(editorUrl: string, lang?: string) {
    const iframeId = "makecoderenderer" + editorUrl;
    const iframe = useRef<HTMLIFrameElement>(document.getElementById(iframeId) as HTMLIFrameElement)
    const [ready, setRendererReady] = useState(!!iframe.current?.dataset.ready);
    const pendingRequests = useMemo<{
        [index: string]: RenderBlocksRequentResponse
    }>(() => ({}), [editorUrl, lang]);

    const sendRequest = (req: RenderBlocksRequestMessage) => {
        console.log(`mkcd: send`, { req, iframe })
        if (ready)
            iframe.current?.contentWindow.postMessage(req, editorUrl);
    }

    const render = (code: string, packageId?: string, pkg?: string, snippetMode?: boolean): Promise<RenderBlocksResponseMessage> => {
        const req: RenderBlocksRequestMessage = {
            type: "renderblocks",
            id: "r" + Math.random(),
            code,
            options: {
                packageId,
                package: pkg,
                dependencies: ["jacdac=github:microsoft/pxt-jacdac"],
                snippetMode
            }
        }
        return new Promise<RenderBlocksResponseMessage>((resolve, reject) => {
            pendingRequests[req.id] = { req, resolve, reject }
            if (ready)
                sendRequest(req);
        })
    }

    // listen for messages
    const handleMessage = (ev: MessageEvent) => {
        let msg = ev.data;
        if (msg.source != "makecode") return;
        console.log({ mkcd: msg })
        switch (msg.type) {
            case "renderready":
                console.log(`mkcd: renderer ready, ${Object.keys(pendingRequests).length} pending`)
                iframe.current.dataset.ready = "1";
                setRendererReady(true);
                break;
            case "renderblocks":
                const id = msg.id; // this is the id you sent
                const r = pendingRequests[id];
                if (!r) return;
                delete pendingRequests[id];
                r.resolve(msg as RenderBlocksResponseMessage);
                break;
        }
    }

    useEffect(() => {
        window.addEventListener("message", handleMessage, false);
        if (!iframe.current) {
            console.log(`mkcd: loading iframe`)
            const f = document.createElement("iframe");
            f.id = "makecoderenderer" + editorUrl;
            f.style.position = "absolute";
            f.style.left = "0";
            f.style.bottom = "0";
            f.style.width = "1px";
            f.style.height = "1px";
            f.src = `${editorUrl}--docs?render=1${lang ? `&lang=${lang}` : ''}`;
            document.body.appendChild(f);
            iframe.current = f;
        }
        return () => window.removeEventListener("message", handleMessage)
    }, [editorUrl, lang])

    useEffect(() => {
        if (iframe.current && ready)
            Object.keys(pendingRequests)
                .forEach(k => sendRequest(pendingRequests[k].req));
    }, [iframe, ready])

    return {
        render,
        ready
    }
}

export interface SnippetProps {
    // MakeCode TypeScript code to render
    code?: string;
    packageId?: string;
    package?: string;
    snippetMode?: boolean;
}

interface SnippetState {
    uri?: string;
    width?: number;
    height?: number;
    error?: string;
}

function MakeCodeSnippetTab(props: SnippetProps) {
    const { code, packageId, package: _package, snippetMode } = props;
    const { render } = useRenderer("http://localhost:3232/");
    const [snippet, setSnippet] = useState<SnippetState>({})
    const { uri, width, height } = snippet;
    const theme = useTheme();
    const classes = useStyles();

    useEffectAsync(async (mounted) => {
        const resp = await render(code, packageId, _package, snippetMode)
        if (mounted())
            setSnippet(resp);
    }, [code, packageId, _package, snippetMode])

    return <>
        {!uri && <Skeleton variant="rect" animation="wave" width={"100%"} height={theme.spacing(5)} />}
        {uri && <img className={classes.img} alt={code} src={uri} width={width} height={height} />}
    </>
}

function MakeCodeSnippetNoSSR(props: SnippetProps) {
    const { code } = props;
    const [tab, setTab] = useState(0);
    const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
        setTab(newValue);
    };

    return <PaperBox>
        <Tabs value={tab} onChange={handleTabChange} aria-label="Select MakeCode editor">
            <Tab label={"Blocks"} />
            <Tab label={"JavaScript"} />
        </Tabs>
        <TabPanel value={tab} index={0}>
            <MakeCodeSnippetTab {...props} />
        </TabPanel>
        <TabPanel value={tab} index={1}>
            <CodeBlock className="typescript">{code}</CodeBlock>
        </TabPanel>
    </PaperBox>
}

export default function MakeCodeSnippet(props: SnippetProps) {
    return <NoSsr>
        <MakeCodeSnippetNoSSR {...props} />
    </NoSsr>
}