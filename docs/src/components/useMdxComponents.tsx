import React from "react";
import { Link } from "gatsby-theme-material-ui";
import CodeDemo from "./CodeDemo";
import CodeBlock from './CodeBlock';
import { useTheme } from "@material-ui/core";
import RandomGenerator from "./RandomGenerator"
import DeviceList from "./DeviceList"
import ServiceList from "./ServiceList"
import DeviceSpecificationList from "./DeviceSpecificationList"

export default function useMdxComponents() {
  const mdxComponents: any = {
    CodeDemo: (props: any) => <CodeDemo {...props} />,
    Link: (props: any) => <Link color="textPrimary" {...props} />,
    a: (props: any) => <Link color="textPrimary" {...props} />,
    pre: props => <div {...props} />,
    code: CodeBlock,

    RandomGenerator: props => <RandomGenerator {...props} />,
    DeviceList: props => <DeviceList {...props} />,
    ServiceList: props => <ServiceList {...props} />,
    DeviceSpecificationList: props => <DeviceSpecificationList {...props} />
  };

  return mdxComponents;
}