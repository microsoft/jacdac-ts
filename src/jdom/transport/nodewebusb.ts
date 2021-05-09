import { USBOptions } from "../jacdac-jdom"
import { HF2_DEVICE_MAJOR } from "./hf2"

export function createNodeUSBOptions(): USBOptions {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const USB = require("webusb").USB

    function findDevice(devices: USBDevice[]) {
        for (const device of devices) {
            if (device.deviceVersionMajor == HF2_DEVICE_MAJOR) {
                for (const iface of device.configuration.interfaces) {
                    const alt = iface.alternates[0]
                    if (
                        alt.interfaceClass == 0xff &&
                        alt.interfaceSubclass == HF2_DEVICE_MAJOR
                    ) {
                        return device
                    }
                }
            }
        }

        return undefined
    }

    const usb = new USB({
        devicesFound: async (devices: USBDevice[]) => findDevice(devices),
    })

    async function requestDevice(
        options: USBDeviceRequestOptions
    ): Promise<USBDevice> {
        console.log(`requesting device...`)
        try {
            const device = await usb.requestDevice(options)
            return device
        } catch (e) {
            console.debug(e)
            return undefined
        }
    }

    async function getDevices(
        options: USBDeviceRequestOptions
    ): Promise<USBDevice[]> {
        //const devices = await usb.getDevices()
        //return devices
        const dev = await requestDevice(options)
        return dev ? [dev] : []
    }

    return { getDevices, requestDevice }
}
