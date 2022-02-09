import { isCancelError } from "../utils"
import { EventTargetObservable } from "./eventtargetobservable"
import { HF2_DEVICE_MAJOR } from "./hf2"
import { MICROBIT_V2_PRODUCT_ID, MICROBIT_V2_VENDOR_ID } from "./microbit"
import { USBOptions } from "./usbio"

export function createNodeUSBOptions(WebUSB: any): USBOptions {
    console.debug(`jacdac: creating usb transport`)
    async function devicesFound(devices: USBDevice[]): Promise<USBDevice> {
        for (const device of devices) {
            const { vendorId, productId, deviceVersionMajor } = device
            // microbit v2
            if (
                vendorId === MICROBIT_V2_VENDOR_ID &&
                productId === MICROBIT_V2_PRODUCT_ID
            ) {
                console.debug(`usb: found micro:bit v2`)
                return device
            }
            // jacdac device
            else if (deviceVersionMajor == HF2_DEVICE_MAJOR) {
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
    const usb = new WebUSB({
        devicesFound,
        allowAllDevices: true
    })

    async function requestDevice(
        options: USBDeviceRequestOptions
    ): Promise<USBDevice> {
        console.debug(`usb: requesting device...`)
        try {
            const device = await usb.requestDevice(options)
            return device
        } catch (e) {
            if (!isCancelError(e)) console.debug(e)
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
