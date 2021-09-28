import resolve from "rollup-plugin-node-resolve"
import sourceMaps from "rollup-plugin-sourcemaps"
import typescript from "rollup-plugin-typescript2"
import json from "rollup-plugin-json"
import filesize from "rollup-plugin-filesize"
import visualizer from "rollup-plugin-visualizer"
import progress from "rollup-plugin-progress"

export default [
    {
        libraryName: "jacdac",
        dir: "",
        watch: "src/jdom/**",
        external: ["usb", "webusb"],
        umd: true,
        cjs: true,
    },
    {
        libraryName: "jacdac-azure-iot",
        dir: "azure-iot",
        watch: "src/azure-iot/**",
        external: ["jacdac"],
        cjs: true,
    },
    {
        libraryName: "p5.jacdac",
        dir: "p5",
        watch: "src/**",
        external: ["jacdac"],
        web: true,
    },
    { libraryName: "jacdac-tstester", dir: "tstester", external: ["jacdac"] },
    {
        libraryName: "jacdac-embed",
        dir: "embed",
        external: ["jacdac"],
        umd: true,
    },
    {
        libraryName: "jacdac-cli",
        dir: "cli",
        external: ["jacdac", "jacdac-azure-iot", "jacdac-node", "webusb"],
        watch: "src/**",
    },
    {
        libraryName: "jacdac-worker",
        dir: "worker",
        watch: "src/**",
        external: [],
        umd: false,
        cjs: false,
        tsconfig: "src/worker/tsconfig.json",
    },
].map(({ libraryName, dir, external, watch, tsconfig, cjs, umd, web }) => {
    return {
        input: dir ? `src/${dir}/${libraryName}.ts` : `src/${libraryName}.ts`,
        output: [
            {
                file: `dist/${libraryName}.js`,
                format: web ? "umd" : "es",
                sourcemap: true,
                name: "jacdac",
            },
            umd && {
                file: `dist/${libraryName}.umd.js`,
                format: "umd",
                sourcemap: true,
                name: "jacdac",
            },
            cjs && {
                file: `dist/${libraryName}.cjs.js`,
                format: "cjs",
                sourcemap: true,
            },
        ].filter(o => !!o),
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
                tsconfig,
            }),
            // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
            //commonjs(),
            // Allow node_modules resolution, so you can use 'external' to control
            // which external modules to include in the bundle
            // https://github.com/rollup/rollup-plugin-node-resolve#usage
            resolve({
                preferBuiltins: true,
            }),
            // Resolve source maps to the original source
            sourceMaps(),
            progress(),
            filesize(),
            visualizer({ template: "network" }),
        ],
    }
})
