import React from "react";
import { Helmet } from "react-helmet"
import { Typography } from "@material-ui/core";
import ThemeTopLayout from "gatsby-theme-material-ui-top-layout/src/components/top-layout";

export default function TopLayout({ children, theme }) {
  return (<React.Fragment>
    <Helmet>
      <script src="https://cdn.jsdelivr.net/npm/jacdac-ts" />
    </Helmet>
    <ThemeTopLayout theme={theme}>
      <Typography>
        {children}
      </Typography>
    </ThemeTopLayout>
  </React.Fragment>)
}