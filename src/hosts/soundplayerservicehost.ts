import { SoundPlayerCmd, SoundPlayerReg, SRV_SOUND_PLAYER } from "../jdom/constants";
import { jdpack } from "../jdom/pack";
import Packet from "../jdom/packet";
import { OutPipe } from "../jdom/pipes";
import RegisterHost from "../jdom/registerhost";
import ServiceHost from "../jdom/servicehost";

export default class SoundPlayerServiceHost extends ServiceHost {
    readonly volume: RegisterHost<[number]>;
    onPlay?: (volume: number, name: string) => void;
    constructor(
        private readonly sounds: [number, string][]) {
        super(SRV_SOUND_PLAYER);

        this.volume = this.addRegister(SoundPlayerReg.Volume, [0.5]);
        this.addCommand(SoundPlayerCmd.ListSounds, this.handleListSounds.bind(this));
        this.addCommand(SoundPlayerCmd.Play, this.handlePlay.bind(this))
    }

    private async handleListSounds(pkt: Packet) {
        const pipe = OutPipe.from(this.device.bus, pkt, true);
        await pipe.respondForEach(this.sounds, sound => jdpack<[number, string]>("u32 s", sound))
    }

    private handlePlay(pkt: Packet) {
        const [volume, name] = pkt.jdunpack("u0.16 s");
        this.onPlay?.(volume, name)
    }
}