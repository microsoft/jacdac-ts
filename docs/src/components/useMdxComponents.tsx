import React from "react";
import { Link } from "gatsby-theme-material-ui";
import CodeDemo from "./CodeDemo";
import CodeBlock from './CodeBlock'

export default function useMdxComponents(deck?: boolean) {
    const mdxComponents = {
        CodeDemo: (props: any) => <CodeDemo {...props} />,
        Link: (props: any) => <Link color="textPrimary" {...props} />,
        a: (props: any) => <Link color="textPrimary" {...props} />,
        pre: props => <div {...props} />,
        code: CodeBlock
    };

    return mdxComponents;
}