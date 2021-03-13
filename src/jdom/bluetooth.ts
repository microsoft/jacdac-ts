import Packet from "./packet"
import Flags from "./flags"
import {
    BLE_TRANSPORT,
    BLUETOOTH_JACDAC_PACKET_CHARACTERISTIC,
    BLUETOOTH_JACDAC_SERVICE,
} from "./constants"
import { JDTransport } from "./transport"

export function isWebBluetoothEnabled(): boolean {
    return !!Flags.webBluetooth
}

export function isWebBluetoothSupported(): boolean {
    try {
        return (
            typeof navigator !== "undefined" &&
            !!navigator.bluetooth &&
            !!navigator.bluetooth.requestDevice
        )
    } catch (e) {
        return false
    }
}

function bleRequestDevice(
    options?: RequestDeviceOptions
): Promise<BluetoothDevice> {
    // disabled
    if (!Flags.webUSB) return Promise.resolve(undefined)

    try {
        return navigator?.bluetooth?.requestDevice(options)
    } catch (e) {
        console.warn(e)
        return undefined
    }
}

function bleGetDevices(): Promise<BluetoothDevice[]> {
    // disabled
    if (!Flags.webBluetooth) return Promise.resolve([])

    try {
        return navigator?.bluetooth?.getDevices() || Promise.resolve([])
    } catch (e) {
        console.warn(e)
        return Promise.resolve([])
    }
}

class BluetoothTransport extends JDTransport {
    private _device: BluetoothDevice
    private _server: BluetoothRemoteGATTServer
    private _service: BluetoothRemoteGATTService
    private _characteristic: BluetoothRemoteGATTCharacteristic

    constructor(public readonly options: {}) {
        super(BLE_TRANSPORT)

        this.handleDisconnected = this.handleDisconnected.bind(this)
        this.handleCharacteristicChanged = this.handleCharacteristicChanged.bind(
            this
        )
    }

    protected async transportConnectAsync(background: boolean) {
        // get a device
        if (background) {
            const devices = await bleGetDevices()
            this._device = devices?.[0]
        } else {
            const device = await bleRequestDevice({
                filters: [{ services: [BLUETOOTH_JACDAC_SERVICE] }],
            })
            this._device = device
        }

        if (!this._device?.gatt) throw new Error("Device not found")

        // listen for disconnection
        this._device.addEventListener(
            "gattserverdisconnected",
            this.handleDisconnected,
            false
        )

        // connect to gatt
        this._server = await this._device.gatt.connect()
        // connect to service
        this._service = await this._server.getPrimaryService(
            BLUETOOTH_JACDAC_SERVICE
        )
        // connect to characteristic
        this._characteristic = await this._service.getCharacteristic(
            BLUETOOTH_JACDAC_PACKET_CHARACTERISTIC
        )
        // listen for incoming packet
        this._characteristic.addEventListener(
            "characteristicvaluechanged",
            this.handleCharacteristicChanged,
            false
        )
        // start listening
        await this._characteristic.startNotifications()
    }

    protected async transportSendPacketAsync(p: Packet) {
        if (!this._characteristic) {
            console.debug(`trying to send Bluetooth packet while disconnected`)
            return
        }

        const data = p.toBuffer()
        this._characteristic.writeValueWithoutResponse(data)
    }

    protected async transportDisconnectAsync() {
        if (!this._device) return

        console.debug(`ble: disconnecting`)
        try {
            this._characteristic?.removeEventListener(
                "characteristicvaluechanged",
                this.handleCharacteristicChanged
            )
            this._device?.removeEventListener(
                "gattserverdisconnected",
                this.handleDisconnected
            )
            this._server.disconnect()
        } finally {
            this._characteristic = undefined
            this._service = undefined
            this._server = undefined
            this._device = undefined
        }
    }

    private handleDisconnected() {
        // start disconnecting
        this.disconnect()
    }

    private handleCharacteristicChanged(event: Event) {
        const data = new Uint8Array(this._characteristic.value.buffer)
        const pkt = Packet.fromBinary(data, this.bus.timestamp)
        pkt.sender = BLE_TRANSPORT
        this.bus.processPacket(pkt)
    }
}

export function createBluetoothTransport(): JDTransport {
    return new BluetoothTransport({})
}
