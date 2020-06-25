# JACDAC TypeScript

This repository contains a TypeScript/JavaScript client library for the [JACDAC](https://microsoft.github.io/jacdac) protocol.

## Import

Add the [jacdac-ts npm](https://www.npmjs.com/package/jacdac-ts) module to your project.

```
npm install --save jacdac-ts
```

You can also use CDN services to import ``jacdac`` into your html page directly.

```
<script src="https://cdn.jsdelivr.net/npm/jacdac-ts@VERSION"></script>
```

## Usage

Import the library in your Typescript project.

```javascript
import * from 'jacdac-ts'
```

### Connect to the bus

You will need to connect to the JACDAC bus via WebUSB. This needs to be done from a user action, like a click,
for security reasons.

```javascript
const jd = await jacdac.requestUSBBus();
```

### Devices

Once you have the bus connected, you can register to events when device get connected or disconnected.

```javascript
jd.on('deviceconnect', dev => console.log(`connect ${dev}`)
jd.on('devicedisconnect', dev => console.log(`disconnect ${dev}`)
jd.on('deviceannounce', dev => console.log(`announce ${dev}`)
```

Remember that when a device is first connected, it's list of services might not yet be populated. 
This happens later on the ``deviceannounce`` event.

You can get a snapshot of the list of devices from the bus.

```javascript
const devices = jd.devices()
```

## Online tools

A list of sample tools to operate on JACDAC devices, built with this library.

* [packets](./tools/packets), sniff all packets on the bus
* [devices](./tools/devices), list of connected devices
* [console](./tools/console), turns on verbose console and display messages
* [streaming](./tools/streaming), live streaming of sensor data into range widgets
* [streaming-rickshaw](./tools/streaming-rickshaw), live streaming of sensor data into graphs

