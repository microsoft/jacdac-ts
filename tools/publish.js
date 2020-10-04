const { assert } = require("console");
const ghpages = require("gh-pages")
/**
 * This configuration will avoid logging the GH_TOKEN if there is an error.
 */
assert(!!process.env.GITHUB_TOKEN, "missing env GITHUB_TOKEN")
if (!!process.env.GITHUB_TOKEN) {
    ghpages.publish('docs/public', {
        repo: 'https://' + process.env.GITHUB_TOKEN + '@github.com/microsoft/jacdac-ts.git',
        silent: true,

    });
}