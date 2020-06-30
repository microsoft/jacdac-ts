import { HF2_DEVICE_MAJOR } from "../dom/hf2";

const USB = require('webusb').USB;

const devicesFound = async devices => {
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

const usb = new USB({ devicesFound })

/**
 * Node.JS webusb bindings. Make sure to add "webusb" to your package.json config.
 * @param options 
 */
export async function requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice> {
    const device = await usb.requestDevice(options);
    return device;
}

export default requestDevice;