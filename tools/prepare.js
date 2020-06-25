const replace = require('replace-in-file');
const pkg = require('./package.json')
const version = pkg.version;
console.log(`patching docs to ${version}`)

const options = {
  files: './docs/**/*.html',
  from: "/dist/jacdac.umd.js",
  to: `https://cdn.jsdelivr.net/npm/jacdac-ts@${version}`
};

try {
    const results = await replace(options)
    console.log('Replacement results:', results);
  }
  catch (error) {
    console.error('Error occurred:', error);
  }