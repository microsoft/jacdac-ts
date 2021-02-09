# Jacdac TypeScript

This repository contains a TypeScript/JavaScript client library for the [Jacdac](https://aka.ms/jacdac) protocol,
as well as the source of https://aka.ms/jacdac under `/docs`.

* [User Documentation](https://aka.ms/jacdac/)
* Discussions at https://github.com/microsoft/jacdac/discussions
* Issues are tracked on https://github.com/microsoft/jacdac/issues

The rest of this page is for developers of the jacdac-ts library.

## Developer setup

### Codespaces

Edit this project directly from your browser using GitHub Codespaces. If you have access to them,

* open project in a new codespace
* launch the docs server
```
npm run docs
```
* click on the generated URL in the terminal output and voila!

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

* browse to the local server

```
http://localhost:8000?dbg=1
```

To analyze the webpack bundle size,

```
cd docs
gatsby build
gatsby serve
nav to http://127.0.0.1:3001
```

### Jacdac+MakeCode

Open the multi editor to test MakeCode devices with the Jacdac view. You can select to run Jacdac and/or MakeCode on localhost/web from the drop downs.

```
https://makecode.com/multi?jacdac=1&localhost=1
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

## Microsoft Open Source Code of Conduct

This project is hosted at https://github.com/microsoft/jacdac-ts. 
This project has adopted the 
[Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).

Resources:

- [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/)
- [Microsoft Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/)
- Contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with questions or concerns
