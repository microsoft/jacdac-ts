const path = require(`path`)
const fs = require(`fs-extra`)
const { slash } = require(`gatsby-core-utils`)
const { createFilePath } = require(`gatsby-source-filesystem`)
const { serviceSpecifications } = require(`../dist/jacdac-jdom.cjs`)
const { serviceSpecificationToDTDL } = require(`../dist/jacdac-azure-iot.cjs`)

async function createServicePages(graphql, actions, reporter) {
  const { createPage, createRedirect } = actions
  const result = await graphql(`
{
  allServicesJson {
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
    reporter.panicOnBuild('🚨  ERROR: Loading "createPages" query')
    return
  }

  // Create image post pages.
  const serviceTemplate = path.resolve(`src/templates/service.mdx`)
  const serviceTestTemplate = path.resolve(`src/templates/service-test.mdx`)
  // We want to create a detailed page for each
  // Instagram post. Since the scraped Instagram data
  // already includes an ID field, we just use that for
  // each page's path.
  result.data.allServicesJson.nodes.forEach(node => {
    const p = `/services/${node.shortId}/`;
    const ptest = `${p}test/`
    const r = `/services/0x${node.classIdentifier.toString(16)}`
    createPage({
      path: p,
      component: slash(serviceTemplate),
      context: {
        node
      },
    })
    createPage({
      path: ptest,
      component: slash(serviceTestTemplate),
      context: {
        node
      },
    })
    console.log(`service redirect`, { from: r, to: p })
    createRedirect({
      fromPath: r,
      toPath: p
    })
  })
}

async function createDevicePages(graphql, actions, reporter) {
  const { createPage, createRedirect } = actions
  const result = await graphql(`
{
  allDevicesJson {
    nodes {
      id
      name
      company
      firmwares
    }
  }
}
`)

  if (result.errors) {
    reporter.panicOnBuild('🚨  ERROR: Loading "createPages" query')
    return
  }

  // Create image post pages.
  const deviceTemplate = path.resolve(`src/templates/device.mdx`)
  const companyTemplate = path.resolve(`src/templates/device-company.mdx`)
  // We want to create a detailed page for each
  // Instagram post. Since the scraped Instagram data
  // already includes an ID field, we just use that for
  // each page's path.
  result.data.allDevicesJson.nodes.forEach(node => {
    const p = `/devices/${node.id.replace(/-/g, '/')}/`;
    createPage({
      path: p,
      component: slash(deviceTemplate),
      context: {
        node
      },
    })
    // adding firmware identifier redirects
    if (node.firmwares)
      node.firmwares.forEach(fw => {
        const fp = `/firmwares/0x${fw.toString(16)}`;
        const dp = `/devices/0x${fw.toString(16)}`;
        console.log(`firmware redirect`, { from: fp, to: p })
        console.log(`device redirect`, { from: dp, to: p })
        createRedirect({
          fromPath: fp,
          toPath: p
        })
        createRedirect({
          fromPath: dp,
          toPath: p
        })
      })
  })

  const snakify = (name) => {
    return name.replace(/([a-z])([A-Z])/g, (_, a, b) => a + "_" + b)
  }
  const escapeDeviceIdentifier = (text) => {
    if (!text) text = ""
    const escaped = text.trim().toLowerCase().replace(/([^a-z0-9\_-])+/ig, '-')
      .replace(/^-+/, '').replace(/-+$/, '');
    const id = snakify(escaped)
    return id;
  }


  // create device company routes
  const companies = new Set(result.data.allDevicesJson.nodes.map(node => node.company))
  console.log(companies)
  for (const company of companies.keys()) {
    const p = `/devices/${escapeDeviceIdentifier(company).replace(/-/g, '/')}`
    console.log(`device company page`, { p })
    createPage({
      path: p,
      component: slash(companyTemplate),
      context: {
        company
      },
    })

  }
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
      path: node.fields.slug,
      // This component will wrap our MDX content
      component: path.resolve(`./src/components/spec.tsx`),
      context: { id: node.id }
    })
  })
}

async function generateDTMI() {
  const services = serviceSpecifications()
  const dir = './public/dtmi'
  await fs.emptyDir(dir)
  const models = services.filter(srv => !/^_/.test(srv.shortId)).map(serviceSpecificationToDTDL);
  for (const model of models) {
    const route = model["@id"].replace(/^dtmi\:/, '')
      .replace(/;\d*$/, '')
      .replace(/:/g, "/");
    const f = path.join(dir, route + ".json")
    console.log(`dtml ${model["@id"]} => ${f}`)
    await fs.outputFile(f, JSON.stringify(model, null, 2))
  }
}

// Implement the Gatsby API “createPages”. This is
// called after the Gatsby bootstrap is finished so you have
// access to any information necessary to programmatically
// create pages.
exports.createPages = async ({ graphql, actions, reporter }) => {
  await createServicePages(graphql, actions, reporter)
  await createSpecPages(graphql, actions, reporter)
  await createDevicePages(graphql, actions, reporter)
  // generate JSON for DTMI models
  await generateDTMI();
}

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions
  //console.log(`${node.internal.type} -> ${node.value}`)
  if (node.internal.type === `Mdx`) {
    const value = createFilePath({ node, getNode })
    createNodeField({
      name: `slug`,
      node,
      value,
    })
    if (node.frontmatter && !node.frontmatter.title) {
      const heading = /#\s*([^\n]+)/.exec(node.rawBody)
      if (heading)
        node.frontmatter.title = heading[1].trim()
    }
  }
}

exports.onCreateWebpackConfig = ({ stage, actions, getConfig }) => {
  if (stage.startsWith("develop")) {
    actions.setWebpackConfig({
      resolve: {
        alias: {
          "react-dom": "@hot-loader/react-dom",
        },
      },
    })
  }

  // enable verbose logging
  const config = getConfig()
  config.stats = 'verbose'
  config.performance.hints = "warning";
  actions.replaceWebpackConfig(config)
}