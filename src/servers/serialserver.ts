import { Packet, toHex } from "../jacdac"
import {
    SerialCmd,
    SerialParityType,
    SerialReg,
    SRV_SERIAL,
} from "../jdom/constants"
import { JDRegisterServer } from "../jdom/servers/registerserver"
import { JDServiceServer } from "../jdom/servers/serviceserver"

export class SerialServer extends JDServiceServer {
    readonly connected: JDRegisterServer<[boolean]>
    readonly baudRate: JDRegisterServer<[number]>
    readonly dataBits: JDRegisterServer<[number]>
    readonly stopBits: JDRegisterServer<[number]>
    readonly parityMode: JDRegisterServer<[SerialParityType]>
    readonly bufferSize: JDRegisterServer<[number]>

    constructor(options?: {
        baudRate?: number
        dataBits?: number
        stopBits?: number
        parityMode?: SerialParityType
        bufferSize?: number
        connectionName?: string
    }) {
        super(SRV_SERIAL)
        const {
            baudRate = 115200,
            dataBits = 8,
            stopBits = 1,
            parityMode = SerialParityType.None,
            bufferSize = 64,
            connectionName,
        } = options || {}

        this.connected = this.addRegister(SerialReg.Connected, [false])
        this.baudRate = this.addRegister(SerialReg.BaudRate, [baudRate])
        this.dataBits = this.addRegister(SerialReg.DataBits, [dataBits])
        this.stopBits = this.addRegister(SerialReg.StopBits, [stopBits])
        this.parityMode = this.addRegister(SerialReg.ParityMode, [parityMode])
        this.bufferSize = this.addRegister(SerialReg.BufferSize, [bufferSize])
        if (connectionName)
            this.addRegister(SerialReg.ConnectionName, [connectionName])
        this.addCommand(SerialCmd.Send, this.handleSend.bind(this))
    }

    private handleSend(pkt: Packet) {
        const [connected] = this.connected.values()
        if (!connected) return // ignore

        console.debug(`serial send`, toHex(pkt.data))
    }
}
