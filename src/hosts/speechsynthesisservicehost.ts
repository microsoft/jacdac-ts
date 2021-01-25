import { SpeechSynthesisCmd, SpeechSynthesisReg, SRV_SPEECH_SYNTHESIS } from "../jdom/constants";
import { Packet } from "../jdom/packet";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost from "../jdom/servicehost";

export default class SpeechSynthesisServiceHost extends JDServiceHost {
    readonly enabled: JDRegisterHost<[boolean]>;
    readonly pitch: JDRegisterHost<[number]>;
    readonly rate: JDRegisterHost<[number]>;
    readonly lang: JDRegisterHost<[string]>;
    readonly volume: JDRegisterHost<[number]>;

    readonly synthesis: SpeechSynthesis;

    constructor() {
        super(SRV_SPEECH_SYNTHESIS)

        this.synthesis = typeof window !== "undefined" && window.speechSynthesis;

        this.enabled = this.addRegister<[boolean]>(SpeechSynthesisReg.Enabled, [!this.synthesis?.paused]);
        this.pitch = this.addRegister<[number]>(SpeechSynthesisReg.Pitch, [1]);
        this.rate = this.addRegister<[number]>(SpeechSynthesisReg.Rate, [1]);
        this.lang = this.addRegister<[string]>(SpeechSynthesisReg.Lang, [""]);
        this.volume = this.addRegister<[number]>(SpeechSynthesisReg.Volume, [0xff])

        this.addCommand(SpeechSynthesisCmd.Speak, this.handleSpeak.bind(this));
        this.addCommand(SpeechSynthesisCmd.Cancel, this.handleCancel.bind(this));
    }

    private handleSpeak(pkt: Packet) {
        const [text] = pkt.jdunpack("s");
        if (!this.synthesis || !text)
            return;

        const [pitch] = this.pitch.values();
        const [rate] = this.pitch.values()
        const [lang] = this.lang.values()
        const [volume] = this.volume.values()

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = pitch;
        utterance.rate = rate;
        utterance.lang = lang;
        utterance.volume = volume / 0xff;

        console.log(utterance)

        this.synthesis.speak(utterance);
    }

    private handleCancel(pkt: Packet) {
        this.synthesis?.cancel();
    }
}