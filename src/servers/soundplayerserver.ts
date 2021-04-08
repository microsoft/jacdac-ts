import {
    SoundPlayerCmd,
    SoundPlayerReg,
    SRV_SOUND_PLAYER,
} from "../jdom/constants"
import { jdpack } from "../jdom/pack"
import Packet from "../jdom/packet"
import { OutPipe } from "../jdom/pipes"
import JDRegisterServer from "../jdom/registerserver"
import JDServiceServer from "../jdom/serviceserver"

export type SoundPlayerSound = [number, string]

export default class SoundPlayerServer extends JDServiceServer {
    readonly volume: JDRegisterServer<[number]>
    onPlay?: (name: string) => void
    constructor(private readonly sounds: SoundPlayerSound[]) {
        super(SRV_SOUND_PLAYER)

        this.volume = this.addRegister(SoundPlayerReg.Volume, [0.5])
        this.addCommand(
            SoundPlayerCmd.ListSounds,
            this.handleListSounds.bind(this)
        )
        this.addCommand(SoundPlayerCmd.Play, this.handlePlay.bind(this))
    }

    private async handleListSounds(pkt: Packet) {
        const pipe = OutPipe.from(this.device.bus, pkt, true)
        await pipe.respondForEach(this.sounds, sound =>
            jdpack<[number, string]>("u32 s", sound)
        )
    }

    private handlePlay(pkt: Packet) {
        const [name] = pkt.jdunpack("s")
        this.onPlay?.(name)
    }
}
