import { Transport, Proto } from "./hf2";
import { JDBus, BusState, BusOptions } from "./bus";
import Packet from "./packet";
import { Observable } from "./observable";
import { EventTargetObservable } from "./eventtargetobservable";
import { delay } from "./utils";

const HF2 = "HF2"

export interface USBOptions {
    getDevices: () => Promise<USBDevice[]>;
    requestDevice: (options: USBDeviceRequestOptions) => Promise<USBDevice>,
    connectObservable?: Observable<USBConnectionEvent>;
    disconnectObservable?: Observable<USBConnectionEvent>;
}

export function isWebUSBSupported(): boolean {
    try {
        return typeof navigator !== "undefined"
            && !!navigator.usb
            && !!navigator.usb.requestDevice
    } catch (e) {
        return false;
    }
}

function usbRequestDevice(options?: USBDeviceRequestOptions): Promise<USBDevice> {
    try {
        return navigator?.usb?.requestDevice(options)
    } catch (e) {
        console.warn(e)
        return undefined;
    }
}

function usbGetDevices(): Promise<USBDevice[]> {
    try {
        return navigator?.usb?.getDevices() || Promise.resolve([])
    }
    catch (e) {
        console.warn(e)
        return Promise.resolve([]);
    }
}

export function createUSBBus(options?: USBOptions, busOptions?: BusOptions): JDBus {
    console.log(`creating new JACDAC bus`)
    if (!options) {
        if (isWebUSBSupported()) {
            options = {
                getDevices: usbGetDevices,
                requestDevice: usbRequestDevice,
                connectObservable: new EventTargetObservable(navigator.usb, "connect"),
                disconnectObservable: new EventTargetObservable(navigator.usb, "disconnect")
            }
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
                bus.errorHandler(HF2, e)
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
    }, busOptions);
    options?.connectObservable?.subscribe({
        next: ev => {
            console.log(`usb device event: connect, `, bus.connectionState, ev)
            if (bus.connectionState === BusState.Disconnected)
                delay(500)
                    .then(() => bus.connectAsync(true))
        }
    })
    return bus;
}