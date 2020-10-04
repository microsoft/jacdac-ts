const { assert } = require("console");
const ghpages = require("gh-pages")
/**
 * This configuration will avoid logging the GH_TOKEN if there is an error.
 */
assert(!!process.env.GITHUB_TOKEN, "missing env GITHUB_TOKEN")
console.log(`uploading to gh-pages`)
ghpages.publish('docs/public', {
    repo: 'https://' + process.env.GITHUB_TOKEN + '@github.com/microsoft/jacdac-ts.git',
    silent: true,

}, (err) => {
    console.log(`upload done`)
    if (err) {
        console.error(err)
        throw err;
    }
});
