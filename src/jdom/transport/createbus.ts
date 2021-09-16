import JDBus from "../bus"
import { createUSBTransport } from "./usb"
import { createWebSerialTransport } from "./webserial"
import { createBluetoothTransport } from "./bluetooth"
import { USBOptions } from "./usbio"

/**
 * Creates a Jacdac bus using various transports
 * @param options
 * @returns
 * @category Transport
 */
export default function createBus(options?: { usbOptions?: USBOptions }) {
    return new JDBus([
        createUSBTransport(options?.usbOptions),
        createWebSerialTransport(),
        createBluetoothTransport(),
    ])
}
