import React, { createContext, useState } from "react";
import { MakeCodeSnippetRendered, MakeCodeSnippetSource, useRenderer } from "./useRenderer";
import useLocalStorage from "../useLocalStorage"

export interface MakeCodeSnippetContextProps {
    target: string, setTarget: (t: string) => void,
    editor: string, setEditor: (t: string) => void,
    render: (source: MakeCodeSnippetSource) => Promise<MakeCodeSnippetRendered>,
}

const MakeCodeSnippetContext = createContext<MakeCodeSnippetContextProps>({
    target: undefined,
    setTarget: (t) => { },
    editor: undefined,
    setEditor: (t) => { },
    render: r => undefined
});
MakeCodeSnippetContext.displayName = "MakeCode";

export default MakeCodeSnippetContext;

export function MakeCodeSnippetProvider(props: { children }) {
    const { value: target, setValue: setTarget } = useLocalStorage("mkcd:editor", "microbit");
    const { value: editor, setValue: setEditor } = useLocalStorage("mdcd:editor", "blocks");
    const [lang, setLang] = useState("")
    const { children } = props;
    const { render } = useRenderer(target, lang)

    return <MakeCodeSnippetContext.Provider value={{
        target, setTarget, editor, setEditor,
        render
    }}>
        {children}
    </MakeCodeSnippetContext.Provider>;
}
