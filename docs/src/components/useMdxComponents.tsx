import React from "react";
import { Link } from "gatsby-theme-material-ui";
import CodeDemo from "./CodeDemo";
import CodeBlock from './CodeBlock';
import { useTheme } from "@material-ui/core";

export default function useMdxComponents(deck?: boolean) {
  const theme = useTheme();
  const mdxComponents: any = {
    CodeDemo: (props: any) => <CodeDemo {...props} />,
    Link: (props: any) => <Link color="textPrimary" {...props} />,
    a: (props: any) => <Link color="textPrimary" {...props} />,
    pre: props => <div {...props} />,
    code: CodeBlock
  };

  // override with spectable elements
  if (deck) {
  }

  return mdxComponents;
}