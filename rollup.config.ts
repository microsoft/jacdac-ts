import resolve from "rollup-plugin-node-resolve"
import commonjs from "rollup-plugin-commonjs"
import sourceMaps from "rollup-plugin-sourcemaps"
import camelCase from "lodash.camelcase"
import typescript from "rollup-plugin-typescript2"
import json from "rollup-plugin-json"
import filesize from "rollup-plugin-filesize"
import visualizer from "rollup-plugin-visualizer"
import progress from "rollup-plugin-progress"

export default [
    { libraryName: "jacdac", dir: "", watch: "src/**" },
    {
        libraryName: "jacdac-serviceworker",
        dir: "serviceworder",
        watch: "src/serviceworker/**",
    },
    { libraryName: "jacdac-test", dir: "test", external: ["jacdac"] },
    {
        libraryName: "jacdac-node",
        dir: "node",
        external: ["jacdac", "webusb"],
    },
    { libraryName: "jacdac-embed", dir: "embed", external: ["jacdac"] },
    {
        libraryName: "jacdac-cli",
        dir: "cli",
        external: ["jacdac", "jacdac-node", "webusb"],
        watch: "src/**",
    },
].map(({ libraryName, dir, external, watch }) => {
    return {
        input: dir ? `src/${dir}/${libraryName}.ts` : `src/${libraryName}.ts`,
        output: [
            {
                file: `dist/${libraryName}.umd.js`,
                name: camelCase(libraryName),
                format: "umd",
                sourcemap: true,
            },
            { file: `dist/${libraryName}.js`, format: "es", sourcemap: true },
            {
                file: `dist/${libraryName}.cjs.js`,
                format: "cjs",
                sourcemap: true,
            },
        ],
        // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
        external: external || [],
        watch: {
            include: watch || `src/${dir}/**`,
        },
        plugins: [
            // Allow json resolution
            json(),
            // Compile TypeScript files
            typescript({
                useTsconfigDeclarationDir: true,
            }),
            // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
            commonjs(),
            // Allow node_modules resolution, so you can use 'external' to control
            // which external modules to include in the bundle
            // https://github.com/rollup/rollup-plugin-node-resolve#usage
            resolve(),
            // Resolve source maps to the original source
            sourceMaps(),
            progress(),
            filesize(),
            visualizer({ template: "network" }),
        ],
    }
})
