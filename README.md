# JACDAC ![Build](https://github.com/microsoft/jacdac-ts/workflows/Build/badge.svg)

This repository contains a TypeScript/JavaScript client library for the [JACDAC](https://microsoft.github.io/jacdac) protocol.

* [User Documentation](https://microsoft.github.io/jacdac-ts/)

The rest of this page is for developers of the jacdac-ts library.

## Developer setup

### Codespaces

Gatsby development server is not yet supported in codespaces.

### Setup

* clone this repository and pull all submodules
```
git clone https://github.com/microsoft/jacdac-ts
git submodule update --init --recursive
git pull
```
* install node.js
* install dependencies
```
npm install
```

### VS Code

You are welcome to use any editor you want!!!

* open [Visual Studio Code](https://code.visualstudio.com/)
```
code .
```
* in the Git view, click on the ``jacdac`` branch and select ``main`` so that changes are automatically synched
* install MDX support in VS Code https://marketplace.visualstudio.com/items?itemName=silvenon.mdx

### Docs build

Launch the gatsbdy develop mode and navigate to http://localhost:8000 . This build does not require to load dist as the library is compiled directly into the web site.

* install the docs packages

```
npm run installdocs
```

* run the docs web site locally

```
npm run docs
```

### HTML tools

You can do ``npm run watch`` to watch/build bundles. Bundles are placed under the ``dist`` folder.

```
npm run watch
```

On another terminal, launch a small web server and 
try all the tools under ``docs/static/tools/*`` at http://localhost:8080/docs/static/tools/js/console.html . These tools load the files under ``dist`` so you'll want 
to also run ``npm run watch`` on the side.

```
npm run tools
```

* console http://localhost:8080/docs/static/tools/js/console.html
* devices http://localhost:8080/docs/static/tools/js/devices.html
* flashing http://localhost:8080/docs/static/tools/js/flashing.html
* namer http://localhost:8080/docs/static/tools/js/namer.html
* tfite http://localhost:8080/docs/static/tools/js/tflite.html
* streaming http://localhost:8080/docs/static/tools/js/streaming.html
* streaming-rickshaw: http://localhost:8080/docs/static/tools/js/streaming-rickshaw.html

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
