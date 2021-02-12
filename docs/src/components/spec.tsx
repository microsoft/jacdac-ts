import React from "react"
import { graphql } from "gatsby"
import { MDXRenderer } from "gatsby-plugin-mdx"

export default function PageTemplate({ data: { mdx } }) {
  return <MDXRenderer>{mdx.body}</MDXRenderer>
}

export const pageQuery = graphql`
  query SpecQuery($id: String) {
    mdx(id: { eq: $id }) {
      id
      body
      frontmatter {
        title
        fullScreen
        hideMainMenu
        hideUnderConstruction
        hideToc
      }
    }
  }
`