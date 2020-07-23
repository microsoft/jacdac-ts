const path = require(`path`)
const slug = require(`slug`)
const { slash } = require(`gatsby-core-utils`)

// Implement the Gatsby API “createPages”. This is
// called after the Gatsby bootstrap is finished so you have
// access to any information necessary to programmatically
// create pages.
exports.createPages = async ({ graphql, actions, reporter }) => {
    const { createPage } = actions

    const result = await graphql(`
{
  allSpecJson {
    nodes {
      name
      shortName
      shortId
      classIdentifier
    }
  }
}
`)

    if (result.errors) {
        reporter.panicOnBuild(`Error while running GraphQL query.`)
        return
    }

    // Create image post pages.
    const serviceTemplate = path.resolve(`src/templates/service.mdx`)
    // We want to create a detailed page for each
    // Instagram post. Since the scraped Instagram data
    // already includes an ID field, we just use that for
    // each page's path.
    result.data.allSpecJson.nodes.forEach(node => {
        // Gatsby uses Redux to manage its internal state.
        // Plugins and sites can use functions like "createPage"
        // to interact with Gatsby.
        createPage({
            // Each page is required to have a `path` as well
            // as a template component. The `context` is
            // optional but is often necessary so the template
            // can query data specific to each page.
            path: `/spec/services/${slug(node.shortId)}/`,
            component: slash(serviceTemplate),
            context: {
                node
            },
        })
    })
}