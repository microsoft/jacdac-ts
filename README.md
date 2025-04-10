# Jacdac for JavaScript/TypeScript

**Jacdac** is a plug-and-play hardware/software stack
for **microcontrollers** and their peripherals (sensors/actuators),
with applications to rapid prototyping, making, and physical computing.

This repository contains a **TypeScript/JavaScript** client library for the [Jacdac](https://aka.ms/jacdac) protocol.

-   **[Jacdac Protocol Documentation](https://aka.ms/jacdac/)**
-   **[Documentation](https://jacdac.github.io/jacdac-docs/clients/javascript/)**
-   **[API Reference](https://jacdac.github.io/jacdac-ts/)**
-   Discussions at https://github.com/jacdac/jacdac/discussions
-   Issues are tracked on https://github.com/jacdac/jacdac/issues

The rest of this page is for developers of the jacdac-ts library.


## Developer setup

-   clone this repository and pull all submodules

```
git clone https://github.com/jacdac/jacdac-ts
git submodule update --init --recursive
git pull
```

-   install node.js
-   install yarn

```
[sudo] npm install -g yarn
```

-   install dependencies

```
yarn install --frozen-lockfile
```

### Visual Studio Code

You are welcome to use any editor you want! Visual Studio Code
provides seamless support for git sub-modules and is our preferred editor.

-   open [Visual Studio Code](https://code.visualstudio.com/)

```
code .
```

-   install the recommended extensions (**MDX**, **ESLint** and **Prettier** extensions)
-   in the Git view, click on the `jacdac` branch and select `main` so that changes are automatically synched

### Build

To have a watch developement,

```
yarn watch
```

otherwise to build all libraries

```
yarn dist
```

### Specs build

To regenerate the service definition JSON files from the `.md` files in jacdac-spec,
run

```
yarn buildspecs
```

## Unit tests

We use [Mocha](https://mochajs.org/) to run the unit test suite from `/tests`. To execute the tests,

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
try all the tools under `/tools/*` at [http://localhost:8080/tools](http://localhost:8080/tools) . These tools load the files under `dist` so you'll want
to also run `yarn watch` on the side.

```
yarn tools
```

These tools are also available on the [GitHub pages](https://jacdac.github.io/jacdac-ts/) of this repository:

-   [console](https://jacdac.github.io/jacdac-ts/tools/console.html)
-   [devices](https://jacdac.github.io/jacdac-ts/tools/devices.html)
-   [flashing](https://jacdac.github.io/jacdac-ts/tools/flashing.html)

Experimental...

-   [namer](https://jacdac.github.io/jacdac-ts/tools/namer.html)
-   [tfite](https://jacdac.github.io/jacdac-ts/tools/tflite.html)
-   [streaming](https://jacdac.github.io/jacdac-ts/tools/streaming.html)
-   [streaming-rickshaw](https://jacdac.github.io/jacdac-ts/tools/streaming-rickshaw.html)

### Commits create releases

The releases are automatically created by the build system based on the title of the commit:

-   `patch:...` or `fix:...` patch
-   `minor:...` or `feature:...` minor
