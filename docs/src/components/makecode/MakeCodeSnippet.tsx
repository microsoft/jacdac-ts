import React, { useState, useEffect, useMemo, useRef } from "react";
import useEffectAsync from "../useEffectAsync"
import PaperBox from "../PaperBox"
import Alert from "../Alert"
import { Skeleton } from "@material-ui/lab";

const RENDER_DEBOUNCE_TIMEOUT = 1000;

interface RenderBlocksRequestMessage {
    type: "renderblocks",
    id: string;
    code: string;
    options?: {
        packageId?: string;
        package?: string;
        snippetMode?: boolean;
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
    const [iframe, setIFrame] = useState<HTMLIFrameElement>(undefined)
    const [ready, setRendererReady] = useState(false);
    const nextRequest = useRef(1)
    const pendingRequests = useMemo<{
        [index: string]: RenderBlocksRequentResponse
    }>(() => ({}), [editorUrl, lang]);

    const sendRequest = (req: RenderBlocksRequestMessage) => {
        console.log(`mkcd: send`, req)
        iframe?.contentWindow.postMessage(req, editorUrl);
    }

    const render = (code: string, packageId?: string, pkg?: string, snippetMode?: boolean): Promise<RenderBlocksResponseMessage> => {
        const req: RenderBlocksRequestMessage = {
            type: "renderblocks",
            id: (nextRequest.current++) + "",
            code,
            options: {
                packageId,
                package: pkg,
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

        switch (msg.type) {
            case "renderready":
                console.log(`mkcd: renderer ready, ${Object.keys(pendingRequests).length} pending`)
                setRendererReady(true);
                Object.keys(pendingRequests)
                    .forEach(k => sendRequest(pendingRequests[k].req));
                break;
            case "renderblocks":
                const id = msg.id; // this is the id you sent
                console.log(`mkcd: rendered ${id}`)
                const r = pendingRequests[id];
                if (!r) return;
                delete pendingRequests[id];
                r.resolve(msg as RenderBlocksResponseMessage);
                break;
        }
    }

    useEffect(() => {
        console.log(`mkcd: loading iframe`)
        window.addEventListener("message", handleMessage, false);
        const f = document.createElement("iframe");
        f.id = "makecoderenderer";
        f.style.position = "absolute";
        f.style.left = "0";
        f.style.bottom = "0";
        f.style.width = "1px";
        f.style.height = "1px";
        f.src = `${editorUrl}--docs?render=1${lang ? `&lang=${lang}` : ''}`;
        document.body.appendChild(f);
        setIFrame(f);
        return () => {
            console.log('mkcd: unload iframe')
            window.removeEventListener("message", handleMessage);
            f?.remove();
        }
    }, [editorUrl, lang])

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

export default function MakeCodeSnippet(props: SnippetProps) {
    const { code, packageId, package: _package, snippetMode } = props;
    const { render, ready } = useRenderer("https://makecode.microbit.org/");
    const [snippet, setSnippet] = useState<SnippetState>({})
    const { uri, width, height, error } = snippet;

    useEffectAsync(async (mounted) => {
        const resp = await render(code, packageId, _package, snippetMode)
        if (mounted())
            setSnippet(resp);
    }, [code, packageId, _package, snippetMode])

    // waiting for the iframe to start?
    const loading = !ready;
    // display code if blocks rendering failed
    const precode = (loading
        || !ready
        || !uri) && code;

    return <PaperBox>
        {loading && <Skeleton />}
        {precode && <pre>
            <code>{precode}</code>
        </pre>}
        {uri && <img className="ui image" alt={code} src={uri} width={width} height={height} />}
    </PaperBox>
}