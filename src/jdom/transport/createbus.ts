import JDBus, { BusOptions } from "../bus"
import { createUSBTransport, isWebUSBSupported } from "./usb"
import { createWebSerialTransport, isWebSerialSupported } from "./webserial"
import { createBluetoothTransport, isWebBluetoothSupported } from "./bluetooth"
import { USBOptions } from "./usbio"
import createIFrameBridge from "../bridges/iframebridge"

/**
 * Creates a Jacdac bus using WebUSB, WebSerial or WebBluetooth
 * @param options
 * @returns
 * @category Transport
 */
export function createWebBus(
    options?: {
        usbOptions?: USBOptions
        iframeTargetOrigin?: string
    } & BusOptions
) {
    const {
        usbOptions,
        iframeTargetOrigin,
        client = true,
        ...rest
    } = options || {}
    const bus = new JDBus(
        [
            usbOptions !== null && createUSBTransport(usbOptions),
            createWebSerialTransport(),
            createBluetoothTransport(),
        ],
        { client, ...rest }
    )
    const iframeBridge =
        iframeTargetOrigin !== null && createIFrameBridge(iframeTargetOrigin)
    if (iframeBridge) iframeBridge.bus = bus
    return bus
}

/**
 * Indicates if any of the USB/Serial/Bluetooth transports is supported
 * @returns
 * @category Transport
 */
export function isWebTransportSupported() {
    return (
        isWebUSBSupported() ||
        isWebSerialSupported() ||
        isWebBluetoothSupported()
    )
}
