import React, { useState, useContext } from "react"
import { Breadcrumbs, Typography } from "@material-ui/core";
import { Link } from "gatsby-theme-material-ui";

export default function TocBreadcrumbs(props: { path: string }) {
  const { path } = props;
  const parts = path?.split('/')

  if (!parts?.length) return <></>;

  return <Breadcrumbs maxItems={2} aria-label="breadcrumb">
    {parts.slice(0, parts.length - 1)
      .map((p, i) => <Link color="inherit" to={"/" + parts.slice(0, i).join("/")}>{p}</Link>)}
    {<Typography color="textPrimary">{parts[parts.length - 1]}</Typography>}
  </Breadcrumbs>

}