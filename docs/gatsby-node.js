const path = require(`path`)
const { slash } = require(`gatsby-core-utils`)
const { createFilePath } = require(`gatsby-source-filesystem`)

async function createServicePages(graphql, actions, reporter) {
  const { createPage } = actions
  const result = await graphql(`
{
  allSpecJson {
    nodes {
      name
      shortName
      shortId
      classIdentifier
      extends
      notes {
        short
      }
      packets {
        kind
        name
        identifier
        description
        derived
        fields {
          name
          unit
          type
          storage
          defaultValue
          isSimpleType
          typicalMin
          typicalMax
        }
      }
      source
    }
  }
}
`)

  if (result.errors) {
    reporter.panicOnBuild('🚨  ERROR: Loading "createPages" query')
    return
  }

  // Create image post pages.
  const serviceTemplate = path.resolve(`src/templates/service.mdx`)
  // We want to create a detailed page for each
  // Instagram post. Since the scraped Instagram data
  // already includes an ID field, we just use that for
  // each page's path.
  result.data.allSpecJson.nodes.forEach(node => {
    const p = `/services/${node.shortId}/`;
    console.log(`create page ${p}`)
    createPage({
      // Each page is required to have a `path` as well
      // as a template component. The `context` is
      // optional but is often necessary so the template
      // can query data specific to each page.
      path: p,
      component: slash(serviceTemplate),
      context: {
        node
      },
    })
  }) 
}

async function createSpecPages(graphql, actions, reporter) {
  const { createPage } = actions
  const result = await graphql(`
  {
    allMdx {
      edges {
        node {
          id
          fields {
            slug
          }
          parent {
            ... on File {
              sourceInstanceName
            }
          }
        }
      }
    }
  }  
  `)
  if (result.errors) {
    reporter.panicOnBuild('🚨  ERROR: Loading "createPages" query')
  }
  // Create pages.
  const specs = result.data.allMdx.edges.map(node => node.node).filter(node => {
    return node.parent.sourceInstanceName == "specPages";
  })
  // you'll call `createPage` for each result
  specs.forEach(node => {
    createPage({
      // This is the slug you created before
      // (or `node.frontmatter.slug`)
      path: `/spec${node.fields.slug}`,
      // This component will wrap our MDX content
      component: path.resolve(`./src/components/spec.tsx`),
      context: { id: node.id }
    })
  }) 
}

// Implement the Gatsby API “createPages”. This is
// called after the Gatsby bootstrap is finished so you have
// access to any information necessary to programmatically
// create pages.
exports.createPages = async ({ graphql, actions, reporter }) => {
  await createServicePages(graphql, actions, reporter)
  await createSpecPages(graphql, actions, reporter)
}

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions
  console.log(`${node.internal.type} -> ${node.value}`)
  if (node.internal.type === `Mdx`) {
    const value = createFilePath({ node, getNode })
    createNodeField({
      name: `slug`,
      node,
      value,
    })
  }
}
