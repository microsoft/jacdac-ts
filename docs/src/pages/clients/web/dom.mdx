## DOM

The DOM module is a depenency-free JavaScript library that implements Device, Service, Register and Packet data-structures.

### Setup

Install the ``jacdac-ts`` npm package (see full [setup instructions](/clients/web/setup)).

```
npm install --save-dev jacdac-ts
```

### Connect to the bus

You will need to connect to the JACDAC bus via WebUSB. 
This needs to be done from a user action, like a click,
for security reasons.

```javascript
import { createUSBBus } from "jacdac"

const jd = createUSBBus();
await jd.connectAsync();
```

### Devices

Once you have the bus connected, you can register to events when device get connected or disconnected.

```javascript
import { DEVICE_CONNECT, DEVICE_ANNOUNCE, DEVICE_DISCONNECT } from "jacdac"

jd.on(DEVICE_CONNECT, dev => console.log(`connect ${dev}`)
jd.on(DEVICE_ANNOUNCE, dev => console.log(`disconnect ${dev}`)
jd.on(DEVICE_DISCONNECT, dev => console.log(`announce ${dev}`)
```

Remember that when a device is first connected, it's list of services might not yet be populated. 
This happens later on the ``deviceannounce`` event.

You can get a snapshot of the list of devices from the bus.

```javascript
const devices = jd.devices()
```

See [tools](/tools) for example of vanilla HTML/JavaScript pages using the library.
