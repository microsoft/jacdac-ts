#!/usr/bin/env node
const esbuild = require("esbuild")
const childProcess = require("child_process")

let watch = false

const args = process.argv.slice(2)
if (args[0] == "--watch" || args[0] == "-watch" || args[0] == "-w") {
  args.shift()
  watch = true
}

if (args.length) {
  console.log("Usage: ./build.js [--watch]")
  process.exit(1)
}

function runTSC(args) {
  return new Promise((resolve, reject) => {
    let invoked = false
    if (watch) args.push("--watch", "--preserveWatchOutput")
    console.log("run tsc " + args.join(" "))
    const process = childProcess.fork("node_modules/typescript/lib/tsc.js", args)
    process.on("error", err => {
      if (invoked) return
      invoked = true
      reject(err)
    })

    process.on("exit", code => {
      if (invoked) return
      invoked = true
      if (code == 0) resolve()
      else reject(new Error("exit " + code))
    })

    // in watch mode "go in background"
    if (watch)
      setTimeout(() => {
        if (invoked) return
        invoked = true
        resolve()
      }, 500)
  })
}

const files = {
  "dist/jacdac.cjs": "src/jacdac.ts",
  "dist/jacdac.js": "src/jacdac.ts",
  "dist/jacdac.mjs": "src/jacdac.ts",
  "dist/p5.jacdac.js": "src/p5/p5.jacdac.ts",
  "dist/jacdac-azure-iot.mjs": "src/azure-iot/jacdac-azure-iot.ts",
  "dist/jacdac-embed.js": "src/embed/jacdac-embed.ts",
  "dist/jacdac-worker.js": "src/worker/jacdac-worker.ts",
  "dist/jacdac-tstester.mjs": "src/tstester/jacdac-tstester.ts",
}

function check(pr) {
  pr.then(() => { }, err => {
    console.error("Error: " + err.message)
    process.exit(1)
  })
}

async function main() {
  try {
    for (const outfile of Object.keys(files)) {
      const src = files[outfile]
      const cjs = outfile.endsWith(".cjs")
      const mjs = outfile.endsWith(".mjs")
      await esbuild.build({
        entryPoints: [src],
        bundle: true,
        sourcemap: true,
        outfile,
        logLevel: "warning",
        external: ["net", "webusb"],
        platform: cjs ? "node" : "browser",
        target: "es2019",
        format: mjs ? "esm" : cjs ? "cjs" : "iife",
        watch
      })
    }
    console.log("bundle done")
    await runTSC(["-b", "."])
    await runTSC(["-b", "src/worker"])
  } catch { }
}

main()
