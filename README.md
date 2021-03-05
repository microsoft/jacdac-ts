# Jacdac TypeScript and Documentation

**Jacdac** is a bus-based plug-and-play hardware/software stack 
for **microcontrollers** and their peripherals (sensors/actuators), 
with applications to rapid prototyping, making, and physical computing. 

This repository contains a TypeScript/JavaScript client library for the [Jacdac](https://aka.ms/jacdac) protocol.

* [User Documentation](https://aka.ms/jacdac/)
* Discussions at https://github.com/microsoft/jacdac/discussions
* Issues are tracked on https://github.com/microsoft/jacdac/issues

The rest of this page is for developers of the jacdac-ts library.

## Developer setup

* clone this repository and pull all submodules
```
git clone https://github.com/microsoft/jacdac-ts
git submodule update --init --recursive
git pull
```
* install node.js
* install yarn
```
npm install -g yarn
```
* install dependencies
```
yarn install --frozen-lockfile
```

### VS Code

You are welcome to use any editor you want! Visual Studio Code
provides seamless support for git sub-modules and is our preferred editor.

* open [Visual Studio Code](https://code.visualstudio.com/)
```
code .
```
* install the recommended extensions (**MDX**, **ESLint** and **Prettier** extensions)
* in the Git view, click on the ``jacdac`` branch and select ``main`` so that changes are automatically synched

### Build

To have a watch developement,

```
yarn watch
```

otherwise

```
yarn dist
```

### Specs build

To regenerate the service definition JSON files from the ``.md`` files in jacdac-spec,
run

```
yarn buildspecs
```

## Unit tests

We use [Mocha](https://mochajs.org/) to run the unit test suite from ``/tests``. To execute the tests,

```
yarn test
```

## Linting

Run the following command to detect linting issues

```
yarn lint
```

### Jacdac + MakeCode

### Local build

Run this command to rebuild the makecode packages

```
yarn buildpxt
```

### HTML Tools

Launch a small web server and 
try all the tools under ``docs/static/tools/*`` at http://localhost:8080/docs/static/tools/js/console.html . These tools load the files under ``dist`` so you'll want 
to also run ``yarn watch`` on the side.

```
yarn tools
```

* console http://localhost:8080/tools/js/console.html
* devices http://localhost:8080/tools/js/devices.html
* flashing http://localhost:8080/tools/js/flashing.html
* namer http://localhost:8080/tools/js/namer.html
* tfite http://localhost:8080/tools/js/tflite.html
* streaming http://localhost:8080/tools/js/streaming.html
* streaming-rickshaw: http://localhost:8080/tools/js/streaming-rickshaw.html

### Commits create releases

The releases are automatically created by the build system based on the title of the commit:

* ``patch:...`` or ``fix:...``  patch
* ``minor:...`` or ``feature:...`` minor

## Microsoft Open Source Code of Conduct

This project is hosted at https://github.com/microsoft/jacdac-ts. 
This project has adopted the 
[Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).

Resources:

- [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/)
- [Microsoft Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/)
- Contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with questions or concerns
