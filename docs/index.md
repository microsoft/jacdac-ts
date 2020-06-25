# JACDAC TypeScript

This repository contains a TypeScript/JavaScript client library for the [JACDAC](https://microsoft.github.io/jacdac) protocol.

## Usage: npm + TypeScript

Add the [jacdac-ts npm](https://www.npmjs.com/package/jacdac-ts) module to your project.

```
npm install --save jacdac-ts
```

Import the library in your Typescript project.

```javascript
import * from 'jacdac-ts'
```

## Online tools

A list of sample tools to operate on JACDAC devices, built with this library.

* [packets](./tools/packets), sniff all packets on the bus
* [devices](./tools/devices), list of connected devices
* [console](./tools/console), turns on verbose console and display messages
* [streaming](./tools/streaming), live streaming of sensor data into range widgets
* [streaming-rickshaw](./tools/streaming-rickshaw), live streaming of sensor data into graphs

