const replace = require("replace-in-file")
const pkg = require("../package.json")
const version = pkg.version
console.log(`patching version: ${version}`)

// patch with cdn files
async function patchDocs() {
    const fn = `jacdac.js`
    await patch({
        files: "./*.html",
        from: `/dist/${fn}`,
        to: `https://unpkg.com/jacdac-ts@${version}/dist/${fn}`,
    })
}

async function patch(options) {
    try {
        const results = await replace(options)
        console.log("Replacement results:", results)
    } catch (error) {
        console.error("Error occurred:", error)
    }
}

patchDocs()
