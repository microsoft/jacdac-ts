import { BuzzerCmd, BuzzerReg, SRV_BUZZER } from "../jdom/constants"
import { jdunpack } from "../jdom/pack"
import Packet from "../jdom/packet"
import JDRegisterServer from "../jdom/registerserver"
import JDServiceServer, { ServerOptions } from "../jdom/serviceserver"

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

        this.emit(BuzzerServer.PLAY_TONE, [frequency, duration])
    }
}
