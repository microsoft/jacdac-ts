import { EventTargetObservable } from "../eventtargetobservable"
import { HF2_DEVICE_MAJOR } from "./hf2"
import { USBOptions } from "./usbio"

export function createNodeUSBOptions(): USBOptions {
    console.debug(`jacdac: creating usb transport`)

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

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const USB = require("webusb").USB
    const usb = new USB({
        devicesFound: async (devices: USBDevice[]) => findDevice(devices),
    })

    async function requestDevice(
        options: USBDeviceRequestOptions
    ): Promise<USBDevice> {
        console.debug(`requesting device...`)
        try {
            const device = await usb.requestDevice(options)
            console.debug(`Device`, { device })
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

    const connectObservable = new EventTargetObservable(usb, "connect")
    const disconnectObservable = new EventTargetObservable(usb, "disconnect")

    return {
        getDevices,
        requestDevice,
        connectObservable,
        disconnectObservable,
    }
}
