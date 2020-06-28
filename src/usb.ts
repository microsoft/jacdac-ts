import { Transport, Proto } from "./hf2";
import { Bus } from "./bus";
import { Packet } from "./packet";

export interface UsbBusOptions {
    requestDevice?: (options: USBDeviceRequestOptions) => Promise<USBDevice>
}

export function createUSBBus(options?: UsbBusOptions): Bus {
    let requestDevice = options?.requestDevice;
    if (!requestDevice && typeof navigator !== "undefined" && navigator.usb && navigator.usb.requestDevice) {
        requestDevice = options => navigator.usb.requestDevice(options);
    }

    let hf2: Proto;
    const bus = new Bus({
        connectAsync: () => {
            if (hf2) return Promise.resolve();
            const transport = new Transport(requestDevice);
            hf2 = new Proto(transport);
            const onJDMessage = (buf: Uint8Array) => {
                const pkts = Packet.fromFrame(buf, bus.timestamp)
                for (const pkt of pkts)
                    bus.processPacket(pkt);
            }
            return hf2.init().then(() => hf2.onJDMessage(onJDMessage))
        },
        sendPacketAsync: p => {
            const buf = p.toBuffer();
            return hf2.sendJDMessageAsync(buf)
                .then(() => { }, err => console.log(err));
        },
        disconnectAsync: () => {
            const h = hf2;
            hf2 = undefined;
            return h.disconnectAsync();
        }
    });

    return bus;
}