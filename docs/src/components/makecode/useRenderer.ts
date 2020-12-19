import React, { useState, useEffect, useMemo, useRef } from "react";
import useEffectAsync from "../useEffectAsync"
import PaperBox from "../PaperBox"
import { createStyles, makeStyles, NoSsr, Tab, Tabs, useTheme } from '@material-ui/core';
import CodeBlock from "../CodeBlock";
import TabPanel from '../TabPanel';
import { Skeleton } from "@material-ui/lab";
import { unique } from "../../../../src/jdom/utils";
import { makeCodeServices } from "../../../../src/jdom/spec"

export interface MakeCodeSnippetSource {
    code: string;
    ghost?: string;
    meta: {
        editor?: string;
        snippet?: boolean;
        dependencies: string[];
    }
}

export interface MakeCodeSnippetRendered {
    uri?: string;
    width?: number;
    height?: number;
    error?: string;
}


const editors = {
    arcade: "https://arcade.makecode.com/beta/",
    microbit: "https://makecode.microbit.org/beta/",
    maker: "https://maker.makecode.com/"
}

export function parseMakeCodeSnippet(source: string): MakeCodeSnippetSource {
    if (!/^---\n/.test(source))
        return {
            code: source,
            meta: {
                dependencies: []
            }
        };

    const parts = source.replace(/^---\n/, '').split(/---\n/gm)
    let front: string;
    let ghost: string;
    let code: string;
    switch (parts.length) {
        case 1: front = ghost = undefined; code = source; break;
        case 2: [front, code] = parts; break;
        default: [front, ghost, code] = parts; break;
    }

    const meta: {
        editor?: string;
        snippet?: boolean;
        dependencies: string[];
    } = {
        dependencies: []
    }
    front?.replace(/(.+):\s*(.+)\s*\n/g, (m, name, value) => {
        switch (name) {
            case "dep": meta.dependencies.push(value); break;
            case "snippet": meta.snippet = !!value; break;
            default: meta[name] = value;
        }
        return "";
    })

    return {
        code,
        ghost,
        meta
    }
}

interface RenderBlocksRequestMessage {
    type: "renderblocks",
    id: string;
    code: string;
    ghost?: string;
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

export function useRenderer(target: string, lang?: string) {
    const iframeId = "makecoderenderer" + target;
    const pendingRequests = useMemo<{
        [index: string]: RenderBlocksRequentResponse
    }>(() => ({}), [target, lang]);

    const useLocalhost = /localhostmakecode=1/.test(window.location.search);
    const editorUrl = 
        useLocalhost ? "http://localhost:3232/--docs" 
        : ((editors[target] || editors["microbit"]) + "---docs")
    console.log({ target, editorUrl })

    const sendRequest = (req: RenderBlocksRequestMessage) => {
        console.log(`send`)
        const iframe = document.getElementById(iframeId) as HTMLIFrameElement;
        if (iframe?.dataset.ready)
            iframe?.contentWindow.postMessage(req, editorUrl);
    }

    const render = (source: MakeCodeSnippetSource): Promise<MakeCodeSnippetRendered> => {
        const { code, ghost, meta } = source;
        const { dependencies, snippet } = meta;

        // spin up iframe on demans
        if (!document.getElementById(iframeId)) {
            console.log(`mkcd: loading iframe`)
            const f = document.createElement("iframe");
            f.id = iframeId;
            f.style.position = "absolute";
            f.style.left = "0";
            f.style.bottom = "0";
            f.style.width = "1px";
            f.style.height = "1px";
            f.src = `${editorUrl}?render=1${lang ? `&lang=${lang}` : ''}`;
            document.body.appendChild(f);
        }

        const mkcds = makeCodeServices()
        const deps = unique(
            ["jacdac=github:microsoft/pxt-jacdac"]
                .concat(dependencies || [])
                .concat(mkcds.filter(info => {
                    const src = (ghost || "") + "\n" + (code || "");
                    return src.indexOf(info.client.qName) > -1
                        || (info.client.default && src.indexOf(info.client.default) > -1);
                }).map(info => `${info.client.name.replace(/^pxt-/, '')}=github:${info.client.repo}`)
                )
        );

        const req: RenderBlocksRequestMessage = {
            type: "renderblocks",
            id: "r" + Math.random(),
            code,
            ghost,
            options: {
                dependencies: deps,
                snippetMode: snippet
            }
        }
        return new Promise<RenderBlocksResponseMessage>((resolve, reject) => {
            pendingRequests[req.id] = { req, resolve, reject }
            sendRequest(req);
        })
    }

    // listen for messages
    const handleMessage = (ev: MessageEvent) => {
        let msg = ev.data;
        if (msg.source != "makecode") return;
        console.log({ msg })
        switch (msg.type) {
            case "renderready":
                console.log(`mkcd: renderer ready, ${Object.keys(pendingRequests).length} pending`)
                const iframe = document.getElementById(iframeId)
                if (iframe) {
                    console.log(`flushing messages`)
                    iframe.dataset.ready = "1"
                    Object.keys(pendingRequests)
                        .forEach(k => sendRequest(pendingRequests[k].req));
                }
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
        return () => window.removeEventListener("message", handleMessage)
    }, [])

    return {
        render
    }
}
