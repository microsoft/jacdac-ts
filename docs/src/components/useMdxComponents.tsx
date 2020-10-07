import React from "react";
import { Link } from "gatsby-theme-material-ui";
import CodeDemo from "./CodeDemo";
import CodeBlock from './CodeBlock';
import { mdxComponentMap } from "spectacle"

export default function useMdxComponents(deck?: boolean) {
    const mdxComponents: any = {
        CodeDemo: (props: any) => <CodeDemo {...props} />,
        Link: (props: any) => <Link color="textPrimary" {...props} />,
        a: (props: any) => <Link color="textPrimary" {...props} />,
        pre: props => <div {...props} />,
        code: CodeBlock
    };

    // override with spectable elements
    if (deck) {
        Object.keys(mdxComponentMap).forEach(k => { mdxComponents[k] = mdxComponentMap[k] })
        mdxComponents["code"] = props => <CodeBlock {...props} />
    }

    return mdxComponents;
}