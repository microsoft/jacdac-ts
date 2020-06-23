import { HF2_DEVICE_MAJOR } from "./hf2";

const webusb = require('webusb');

const usb = new webusb.USB({
    devicesFound: async devices => {
        for (const device of devices) {
            if (device.deviceVersionMajor == HF2_DEVICE_MAJOR) {
                for (const iface of device.configuration.interfaces) {
                    const alt = iface.alternates[0]
                    if (alt.interfaceClass == 0xff && alt.interfaceSubclass == HF2_DEVICE_MAJOR) {
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
export function requestDevice(options: USBDeviceRequestOptions) {
    return usb.requestDevice(options);
}
