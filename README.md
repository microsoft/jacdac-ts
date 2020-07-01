# JACDAC ![Build](https://github.com/microsoft/jacdac-ts/workflows/Build/badge.svg)

This repository contains a TypeScript/JavaScript client library for the [JACDAC](https://microsoft.github.io/jacdac) protocol.

* [User Documentation](https://microsoft.github.io/jacdac-ts/)

The rest of this page is for developers of the jacdac-ts library.

## Developer setup

### Setup

* run ``npm install``

### Build watch

You can do ``npm run watch`` to watch/build bundles. Bundles are placed under the ``dist`` folder.

### HTML tools

Launch a small web server and try all the tools under ``docs/static/tools/*`` at http://localhost:8080/docs/static/tools/console.html . These tools load the files under ``dist`` so you'll want to also run watch on the side.

```
npm run tools
```

### Gatsby build

Launch the gatsbdy develop mode and navigate to http://localhost:8000 . This build does not require to load dist as the library is compiled directly into the web site.

```
npm run docs
```

### Commits create releases

The releases are automatically created by the build system based on the title of the commit:

* ``patch|fix:...``  patch
* ``minor:feature:...`` minor

### NPM scripts

 - `npm run watch`: Run `npm run build` in watch mode
 - `npm run lint`: Lints code
 - `npm run docs`: Launch docs web service

# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
