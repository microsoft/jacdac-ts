import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import sourceMaps from 'rollup-plugin-sourcemaps'
import camelCase from 'lodash.camelcase'
import typescript from 'rollup-plugin-typescript2'
import json from 'rollup-plugin-json'

const pkg = require('./package.json')

export default [
  { libraryName: 'jacdac-dom', dir: 'dom' },
  { libraryName: 'jacdac-graphql', dir: 'graphql', external: ["jacdac-dom"] }, // include graphqljs
  { libraryName: 'jacdac-node', dir: 'node', external: ["jacdac-dom", "webusb"] },
  { libraryName: 'jacdac-react', dir: 'react', external: ["jacdac-dom", "react"] },
  { libraryName: 'jacdac', dir: '', external: ["jacdac-dom", "react", "jacdac-rect", "webusb", "jacdac-node"] },
].map(({ libraryName, dir, external }) => {
  return {
    input: `src/${dir}/${libraryName}.ts`,
    output: [
      { file: `dist/${libraryName}.umd.js`, name: camelCase(libraryName), format: 'umd', sourcemap: true },
      { file: `dist/${libraryName}.es5.js`, format: 'es', sourcemap: true }
    ],
    // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
    external: external || [],
    watch: {
      include: `src/${dir}/**`
    },
    plugins: [
      // Allow json resolution
      json(),
      // Compile TypeScript files
      typescript({
        useTsconfigDeclarationDir: true
      }),
      // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
      commonjs(),
      // Allow node_modules resolution, so you can use 'external' to control
      // which external modules to include in the bundle
      // https://github.com/rollup/rollup-plugin-node-resolve#usage
      resolve(),
      // Resolve source maps to the original source
      sourceMaps()
    ]
  }
})
