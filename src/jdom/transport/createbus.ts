import JDBus from "../bus"
import { createUSBTransport } from "./usb"
import { createWebSerialTransport } from "./webserial"
import { createBluetoothTransport } from "./bluetooth"
import { USBOptions } from "./usbio"

/**
 * Creates a Jacdac bus using WebUSB, WebSerial or WebBluetooth
 * @param options
 * @returns
 * @category Transport
 */
export function createWebBus(options?: { usbOptions?: USBOptions }) {
    return new JDBus([
        createUSBTransport(options?.usbOptions),
        createWebSerialTransport(),
        createBluetoothTransport(),
    ])
}
