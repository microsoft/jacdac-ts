/**
 * Layout component that queries for data
 * with Gatsby's useStaticQuery component
 *
 * See: https://www.gatsbyjs.org/docs/use-static-query/
 */

import React from "react"
import PropTypes from "prop-types"
import { useStaticQuery, graphql } from "gatsby"
import JacdacProvider from "../jacdac/Provider"

import Header from "./header"
// tslint:disable-next-line: no-import-side-effect
import "./layout.css"
import { Typography } from "@material-ui/core"

const Layout = ({ children }) => {
  const data = useStaticQuery(graphql`
    query SiteTitleQuery {
      site {
        siteMetadata {
          title
        }
      }
    }
  `)

  return (
    <JacdacProvider>
      <Typography>
        <Header siteTitle={data.site.siteMetadata.title} />
        <div
          style={{
            margin: `0 auto`,
            maxWidth: 1280,
            padding: `1rem 1.0875rem 1.45rem`,
          }}
        >
          <main>
            {children}
          </main>
          <footer>
            © {new Date().getFullYear()} Microsoft Corporation
        </footer>
        </div>
      </Typography>
    </JacdacProvider>
  )
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
}

export default Layout
