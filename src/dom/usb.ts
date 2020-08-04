import { Transport, Proto } from "./hf2";
import { JDBus } from "./bus";
import { Packet } from "./packet";

export interface USBOptions {
    getDevices: () => Promise<USBDevice[]>;
    requestDevice: (options: USBDeviceRequestOptions) => Promise<USBDevice>
}

export function isWebUSBSupported(): boolean {
    return typeof navigator !== "undefined"
        && !!navigator.usb
        && !!navigator.usb.requestDevice;
}

export function createUSBBus(options?: USBOptions): JDBus {
    if (!options) {
        if (isWebUSBSupported())
            options = {
                getDevices: () => navigator.usb.getDevices(),
                requestDevice: (filters) => navigator.usb.requestDevice(filters)
            }
    }
    // dummy impl
    if (!options) {
        options = {
            getDevices: () => Promise.resolve([]),
            requestDevice: (filters) => Promise.resolve(undefined)
        }
    }
    let hf2: Proto;
    const bus = new JDBus({
        connectAsync: (background) => {
            if (hf2) {
                console.log(`reusing hf2`)
                return Promise.resolve();
            }
            const transport = new Transport(options);
            transport.onError = (e) => {
                bus.errorHandler("HF2", e)
                bus.disconnectAsync()
            }
            hf2 = new Proto(transport);
            const onJDMessage = (buf: Uint8Array) => {
                const pkts = Packet.fromFrame(buf, bus.timestamp)
                for (const pkt of pkts)
                    bus.processPacket(pkt);
            }
            return hf2.connectAsync(background)
                .then(() => hf2.onJDMessage(onJDMessage))
                .catch(e => {
                    console.log(`hf2 connection error`)
                    hf2 = undefined;
                    throw e;
                })
        },
        sendPacketAsync: p => {
            if (!hf2)
                return Promise.reject("hf2 transport disconnected")

            const buf = p.toBuffer();
            return hf2.sendJDMessageAsync(buf)
                .then(() => { });
        },
        disconnectAsync: () => {
            const h = hf2;
            hf2 = undefined;
            return h ? h.disconnectAsync() : Promise.resolve();
        }
    });

    return bus;
}