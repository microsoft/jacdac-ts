import { HF2_DEVICE_MAJOR } from "../jdom/hf2";

const USB = require('webusb').USB;

const devicesFound = async devices => {
    console.log(devices)
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

export async function requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice> {
    console.log(`requesting device...`)
    const device = await usb.requestDevice(options);
    return device;
}
export async function getDevices(): Promise<USBDevice[]> {
    const devices = await usb.getDevices();
    return devices;
}
