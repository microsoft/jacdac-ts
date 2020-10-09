import React from "react";
import { Link } from "gatsby-theme-material-ui";
import CodeDemo from "./CodeDemo";
import CodeBlock from './CodeBlock';
import { Box } from "@material-ui/core";
import RandomGenerator from "./RandomGenerator"
import DeviceList from "./DeviceList"
import ServiceList from "./ServiceList"
import DeviceSpecificationList from "./DeviceSpecificationList"
import FilteredDeviceSpecificationList from "./FilteredDeviceSpecificationList"
import ServiceSpecificationList from "./ServiceSpecificationList"
import PacketsPreview from "./PacketsPreview"

export default function useMdxComponents() {
  const mdxComponents: any = {
    CodeDemo: (props: any) => <CodeDemo {...props} />,
    Link: (props: any) => <Link color="textPrimary" {...props} />,
    a: (props: any) => <Link color="textPrimary" {...props} />,
    pre: props => <div {...props} />,
    code: CodeBlock,

    RandomGenerator: props => <Box displayPrint="none"><RandomGenerator {...props} /></Box>,
    DeviceList: props => <DeviceList {...props} />,
    ServiceList: props => <ServiceList {...props} />,
    DeviceSpecificationList: props => <DeviceSpecificationList {...props} />,
    FilteredDeviceSpecificationList: props => <FilteredDeviceSpecificationList {...props} />,
    ServiceSpecificationList: props => <ServiceSpecificationList {...props} />,
    PacketsPreview: props => <PacketsPreview {...props} />
  };

  return mdxComponents;
}