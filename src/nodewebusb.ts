const webusb = require('webusb');

const usb = new webusb.USB({
    devicesFound: async devices => {
        for (const device of devices) {
            if (device.deviceVersionMajor == 42) {
                for (const iface of device.configuration.interfaces) {
                    const alt = iface.alternates[0]
                    if (alt.interfaceClass == 0xff && alt.interfaceSubclass == 42) {
                        this.dev = device
                        this.iface = iface
                        this.altIface = alt
                        return device
                    }
                }
            }
        }

        return undefined
    }
})

/**
 * Node.JS webusb bindings. Make sure to add "webusb" to your package.json config.
 * @param options 
 */
function requestDevice(options: USBDeviceRequestOptions) {
    return usb.requestDevice(options);
}
