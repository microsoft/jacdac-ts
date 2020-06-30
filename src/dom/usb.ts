import { Transport, Proto } from "./hf2";
import { Bus } from "./bus";
import { Packet } from "./packet";
import { assert } from "./utils";

export interface USBOptions {
    getDevices(): Promise<USBDevice[]>;
    requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>
    addEventListener(type: "connect" | "disconnect", listener: (this: this, ev: USBConnectionEvent) => any, useCapture?: boolean): void;
    removeEventListener(type: "connect" | "disconnect", callback: (this: this, ev: USBConnectionEvent) => any, useCapture?: boolean): void;
}

export function isWebUSBSupported() {
    return typeof navigator !== "undefined" && navigator.usb
        && !!navigator.usb.requestDevice
        && !!navigator.usb.getDevices;
}

export function createUSBBus(options?: USBOptions): Bus {
    if (!options) {
        if (isWebUSBSupported())
            options = navigator.usb
    }
    assert(!!options)

    let hf2: Proto;
    const bus = new Bus({
        connectAsync: (userRequest) => {
            if (hf2) return Promise.resolve();
            const transport = new Transport(options);
            hf2 = new Proto(transport);
            const onJDMessage = (buf: Uint8Array) => {
                const pkts = Packet.fromFrame(buf, bus.timestamp)
                for (const pkt of pkts)
                    bus.processPacket(pkt);
            }
            return hf2.connectAsync(userRequest)
                .then(() => hf2.onJDMessage(onJDMessage))
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