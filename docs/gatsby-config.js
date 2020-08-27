const maxImageWidth = 800
module.exports = {
  siteMetadata: {
    title: `JACDAC`,
    description: `Documentation for the JACDAC protocol and libraries.`,
    author: `Microsoft`,
    siteUrl: `https://microsoft.github.io/jacdac-ts`
  },
  pathPrefix: "/jacdac-ts",
  plugins: [
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `${__dirname}/src/images`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `images`,
        path: `${__dirname}/../jacdac-spec/spec/images`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `pages`,
        path: `${__dirname}/src/pages`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `specPages`,
        path: `${__dirname}/../jacdac-spec/spec`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `spec`,
        path: `${__dirname}/../jacdac-spec/dist/spec.json`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: `package`,
        path: `${__dirname}/../package.json`,
      },
    },
    `gatsby-plugin-optimize-svgs`,
    `gatsby-transformer-json`,
    `gatsby-theme-material-ui`,
    `gatsby-plugin-react-helmet`,
    `gatsby-transformer-sharp`,
    `gatsby-plugin-sharp`,
    `gatsby-remark-images`,
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `jacdac-ts`,
        short_name: `jacdac-ts`,
        start_url: `/`,
        background_color: `#663399`,
        theme_color: `#663399`,
        display: `minimal-ui`,
        icon: `src/images/gatsby-icon.png`, // This path is relative to the root of the site.
      },
    },
    {
      resolve: `gatsby-plugin-mdx`,
      options: {
        defaultLayouts: {
          extensions: [`.mdx`, `.md`],
          default: require.resolve("./src/components/layout.tsx"),
        },
        gatsbyRemarkPlugins: [
          `gatsby-remark-autolink-headers`,
          'gatsby-plugin-mdx-code-demo',
          `gatsby-remark-prismjs`,
          'gatsby-remark-external-links',
          'gatsby-remark-numbered-footnotes',
          'gatsby-remark-embedder',
          {
            resolve: `gatsby-remark-images`,
            options: {
              // It's important to specify the maxWidth (in pixels) of
              // the content container as this plugin uses this as the
              // base for generating different widths of each image.
              maxWidth: maxImageWidth,
            }
          },
          'gatsby-remark-static-images',
        ]
      },
    },
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        plugins: [
          `gatsby-remark-autolink-headers`,
          `gatsby-remark-prismjs`,
          'gatsby-remark-external-links',
          'gatsby-remark-numbered-footnotes',
          'gatsby-remark-embedder',
          {
            resolve: `gatsby-remark-images`,
            options: {
              // It's important to specify the maxWidth (in pixels) of
              // the content container as this plugin uses this as the
              // base for generating different widths of each image.
              maxWidth: maxImageWidth,
            }
          },
          'gatsby-remark-static-images'
        ],
      },
    },
    "gatsby-plugin-sitemap",
    // this (optional) plugin enables Progressive Web App + Offline functionality
    // To learn more, visit: https://gatsby.dev/offline
    // `gatsby-plugin-offline`,
    "gatsby-plugin-robots-txt",
    "gatsby-plugin-meta-redirect",
  ],
}
