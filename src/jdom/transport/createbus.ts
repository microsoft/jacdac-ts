import JDBus, { BusOptions } from "../bus"
import { createUSBTransport, isWebUSBSupported } from "./usb"
import {
    createWebSerialTransport,
    isWebSerialSupported,
    WebSerialOptions,
} from "./webserial"
import {
    createBluetoothTransport,
    isWebBluetoothSupported,
    WebBluetoothOptions,
} from "./bluetooth"
import { USBOptions } from "./usbio"
import createIFrameBridge from "../bridges/iframebridge"

/**
 * Options to instantiate a bus. By default, the bus acts as a client.
 */
export interface WebBusOptions extends BusOptions {
    /**
     * USB connection options, set to null to disable USB
     */
    usbOptions?: USBOptions

    /**
     * WebSerial connection options, set to null to disable serial
     */
    serialOptions?: WebSerialOptions

    /**
     * WebBluetooth connection options, set to null to disable BLE
     */
    bluetoothOptions?: WebBluetoothOptions

    /**
     * Specify target origin for iframe messages
     */
    iframeTargetOrigin?: string
}

/**
 * Creates a Jacdac bus using WebUSB, WebSerial or WebBluetooth
 * @param options
 * @returns
 * @category Transport
 */
export function createWebBus(options?: WebBusOptions) {
    const {
        usbOptions,
        serialOptions,
        bluetoothOptions,
        iframeTargetOrigin,
        client = true,
        ...rest
    } = options || {}
    const bus = new JDBus(
        [
            usbOptions !== null && createUSBTransport(usbOptions),
            serialOptions !== null && createWebSerialTransport(serialOptions),
            bluetoothOptions !== null &&
                createBluetoothTransport(bluetoothOptions),
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
