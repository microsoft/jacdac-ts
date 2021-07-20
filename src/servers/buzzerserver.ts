import { BuzzerCmd, BuzzerReg, SRV_BUZZER } from "../jdom/constants"
import { jdpack, jdunpack } from "../jdom/pack"
import Packet from "../jdom/packet"
import JDRegisterServer from "../jdom/registerserver"
import JDServiceServer, { ServerOptions } from "../jdom/serviceserver"

export interface BuzzerTone {
    frequency: number
    duration: number
    volume: number
}

export function tonePayload(frequency: number, ms: number, volume: number) {
    const period = Math.round(1000000 / frequency)
    const duty = (period * volume) >> 11
    return jdpack("u16 u16 u16", [period, duty, ms])
}

export default class BuzzerServer extends JDServiceServer {
    readonly volume: JDRegisterServer<[number]>

    static PLAY_TONE = "playTone"

    constructor(options?: ServerOptions) {
        super(SRV_BUZZER, options)

        this.volume = this.addRegister<[number]>(BuzzerReg.Volume, [0.2])
        this.addCommand(BuzzerCmd.PlayTone, this.handlePlayTone.bind(this))
    }

    private handlePlayTone(pkt: Packet) {
        const [period, , duration] = jdunpack<[number, number, number]>(
            pkt.data,
            "u16 u16 u16"
        )
        const frequency = 1000000 / period
        const [volume] = this.volume.values()

        this.emit(BuzzerServer.PLAY_TONE, <BuzzerTone>{
            frequency,
            duration,
            volume,
        })
    }
}
