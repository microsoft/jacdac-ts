const replace = require('replace-in-file');
const myArgs = process.argv.slice(2);
const version = myArgs[0];

console.log(`patching version: ${version}`)

async function patchDocs() {
  await patch({
    files: './docs/**/*.html',
    from: "/dist/jacdac.umd.js",
    to: `https://cdn.jsdelivr.net/npm/jacdac-ts@${version}`
  })
}

async function patch(options) {
  try {
    const results = await replace(options)
    console.log('Replacement results:', results);
  }
  catch (error) {
    console.error('Error occurred:', error);
  }
}

patchDocs();