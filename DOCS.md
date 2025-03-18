# JavaScript/TypeScript package

This package allows you to integrate Jacdac into web applications or Node.JS projects.
The package exposes **JDOM**, a dependency-free JavaScript object model
that reflects the state of the Jacdac elements and allows sending commands as well.
JDOM also handles connection through WebUSB, WebBLE and other transports.

To read guides and overview documents about JDOM, go to [JDOM documentation](https://jacdac.github.io/jacdac-docs/clients/javascript/jdom).

To browser the API documentation, use the list on this page to explore classes.

## Installation

Add the [jacdac-ts npm package](https://www.npmjs.com/package/jacdac-ts) module
to your project

```
npm install --save jacdac-ts
```

or

```
yarn add jacdac-ts
```

then import components as needed using ES6 import syntax

```javascript
import { createWebBus } from "jacdac-ts"

const bus = createWebBus()
```

### CDN / UMD

You can also use CDN services to import `jacdac` into your html page directly.
This will load the ES6 build of the library.

```html
<script src="https://unpkg.com/jacdac-ts@VERSION/dist/jacdac.js"></script>
```

where `@VERSION` is the desired version.
